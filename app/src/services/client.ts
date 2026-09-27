/**
 * The transport. Mock or real HTTP, chosen once at startup.
 *
 * `EXPO_PUBLIC_API=mock` keeps the in-memory service layer: no server needed,
 * works offline, and what the 482 tests run against. Any other value is a base
 * URL and the migrated services speak HTTP to it.
 *
 * Both paths throw the SAME `ApiError` with the same `ApiErrorCode` union, so
 * every screen's error handling works unchanged in either mode — the codes the
 * server sends are the codes the mock already threw.
 *
 * TOKEN STORAGE IS IN MEMORY ONLY, deliberately. Persisting it needs
 * `expo-secure-store`, which is a native module and would stop Expo Go
 * working — a much slower loop than scanning a QR code. The cost is signing in
 * again after an app restart, which is PLAN R7 and still open.
 */

import type { ApiErrorCode } from "./types";

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Mode
// ---------------------------------------------------------------------------

/**
 * Read once. Expo inlines `EXPO_PUBLIC_*` at bundle time, so this cannot change
 * while the app runs — after editing `.env` you must restart Metro with
 * `--clear` or the old value is still baked in.
 */
const RAW_API = (process.env.EXPO_PUBLIC_API ?? "mock").trim();

/** Trailing slashes make `${base}/v1/me` become `//v1/me`, which 404s. */
const BASE_URL = RAW_API.replace(/\/+$/, "");

export function isMockMode(): boolean {
  return BASE_URL === "" || BASE_URL === "mock";
}

export function apiBaseUrl(): string {
  return BASE_URL;
}

const TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 15000);

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

type Tokens = { token: string; refreshToken: string };

let tokens: Tokens | null = null;
/**
 * The signed-in user's id.
 *
 * In mock mode every service uses the literal `"me"`. Against the real API it
 * is a MongoDB id, and services that need to tell "mine" from "theirs" — which
 * side of a thread you are on, whose message this is — have to ask for it
 * rather than assume.
 */
let currentUserId: string | null = null;
/** Set by the session store so a failed refresh can drop the user to signed-out. */
let onAuthLost: (() => void) | null = null;

export function setTokens(next: Tokens | null): void {
  tokens = next;
}

export function setCurrentUserId(id: string | null): void {
  currentUserId = id;
}

/** Falls back to the mock's literal so a shared code path works in both modes. */
export function currentUserIdOrMe(): string {
  return currentUserId ?? "me";
}

export function getAccessToken(): string | null {
  return tokens?.token ?? null;
}

export function onAuthLostHandler(fn: (() => void) | null): void {
  onAuthLost = fn;
}

// ---------------------------------------------------------------------------
// Mock transport (unchanged)
// ---------------------------------------------------------------------------

type ClientConfig = {
  minLatencyMs: number;
  maxLatencyMs: number;
  /**
   * Dev-only. When set, the next calls fail with this code. Driven by the
   * switch in `ui.store.ts` so failure states can be demoed on a device
   * without editing code.
   */
  failureMode: ApiErrorCode | null;
  /** Fail only this fraction of calls (0–1). 1 means every call. */
  failureRate: number;
};

const config: ClientConfig = {
  minLatencyMs: 300,
  maxLatencyMs: 800,
  failureMode: null,
  failureRate: 1,
};

/** Tests set latency to 0; the dev switch sets `failureMode`. */
export function configureClient(next: Partial<ClientConfig>): void {
  Object.assign(config, next);
}

export function getClientConfig(): Readonly<ClientConfig> {
  return { ...config };
}

export function resetClient(): void {
  config.minLatencyMs = 300;
  config.maxLatencyMs = 800;
  config.failureMode = null;
  config.failureRate = 1;
}

function latency(): number {
  const { minLatencyMs, maxLatencyMs } = config;
  if (maxLatencyMs <= minLatencyMs) return minLatencyMs;
  return minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs);
}

/**
 * Wraps a synchronous mock operation in latency and possible failure.
 *
 * The failure check happens AFTER the delay on purpose: a request that fails
 * instantly does not exercise the loading state it is supposed to be testing.
 */
export async function request<T>(produce: () => T | Promise<T>): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, latency()));

  if (config.failureMode && Math.random() < config.failureRate) {
    throw new ApiError(config.failureMode);
  }

  return produce();
}

// ---------------------------------------------------------------------------
// Real transport
// ---------------------------------------------------------------------------

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** The server's envelope: `{ error: { code, message } }`. */
type ErrorBody = { error?: { code?: ApiErrorCode; message?: string } };

/**
 * Maps a failed response to the same `ApiError` the mock throws.
 *
 * The server's own `code` is preferred over the HTTP status, because 429 is
 * ambiguous — it carries both `rateLimited` and `quotaExceeded`, and only the
 * latter drives the out-of-likes screen.
 */
async function toApiError(res: Response): Promise<ApiError> {
  let body: ErrorBody | null = null;
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    body = null;
  }

  const code = body?.error?.code;
  if (code) return new ApiError(code, body?.error?.message);

  if (res.status === 401) return new ApiError("unauthorized");
  if (res.status === 404) return new ApiError("notFound");
  if (res.status === 429) return new ApiError("rateLimited");
  if (res.status >= 500) return new ApiError("server");
  return new ApiError("validation");
}

async function send(method: Method, path: string, body: unknown, auth: boolean): Promise<Response> {
  // `AbortSignal.timeout` is not in every RN runtime, so drive it by hand.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokens?.token) headers.Authorization = `Bearer ${tokens.token}`;

  try {
    return await fetch(`${BASE_URL}/v1${path}`, {
      method,
      headers,
      signal: controller.signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (e) {
    // A DNS failure, a refused connection and a timeout all land here. The
    // client-only `network` code exists for exactly this, and the screens
    // already render a retry state for it.
    if ((e as Error)?.name === "AbortError") throw new ApiError("network", "That took too long.");
    throw new ApiError("network", "Can't reach the server.");
  } finally {
    clearTimeout(timer);
  }
}

let refreshing: Promise<boolean> | null = null;

/**
 * Exchanges the refresh token, once.
 *
 * Shared across concurrent callers: a screen firing three requests that all
 * 401 must not start three rotations — the server treats a replayed refresh
 * token as theft and would revoke the whole session family.
 */
async function refresh(): Promise<boolean> {
  if (!tokens?.refreshToken) return false;

  refreshing ??= (async () => {
    try {
      const res = await send("POST", "/auth/refresh", { refreshToken: tokens?.refreshToken }, false);
      if (!res.ok) return false;

      const next = (await res.json()) as Tokens;
      tokens = { token: next.token, refreshToken: next.refreshToken };
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/**
 * One authenticated request, with a single refresh-and-replay on 401.
 *
 * Only ONE retry: if the refreshed token is also rejected, the session is
 * genuinely gone and looping would just spend the server's rate limit.
 */
export async function http<T>(method: Method, path: string, body?: unknown, auth = true): Promise<T> {
  let res = await send(method, path, body, auth);

  if (res.status === 401 && auth && tokens?.refreshToken) {
    if (await refresh()) {
      res = await send(method, path, body, auth);
    } else {
      tokens = null;
      currentUserId = null;
      onAuthLost?.();
      throw new ApiError("unauthorized");
    }
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

/** Stable, readable ids for records created during a session. */
let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
