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
import { clearSession, saveTokens } from "./secureSession";

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

  /*
   * Persist here rather than only at sign-in, because this is ALSO where a
   * refresh lands. The refresh token rotates on every use and the server
   * destroys the whole session family if an old one is replayed, so a stored
   * copy that missed a rotation is worse than none: the next cold start would
   * present a dead token and sign the user out of every device (PLAN #209).
   *
   * Fire and forget — this function is synchronous and has dozens of callers,
   * and a keychain write is not something any of them should wait for.
   */
  if (!isMockMode()) {
    if (next) void saveTokens(next.token, next.refreshToken);
    else void clearSession();
  }
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

/** A non-JSON body — a voice clip — sent as-is with its own content type. */
class RawBody {
  constructor(
    readonly data: Blob,
    readonly contentType: string,
  ) {}
}

async function send(method: Method, path: string, body: unknown, auth: boolean): Promise<Response> {
  // `AbortSignal.timeout` is not in every RN runtime, so drive it by hand.
  const controller = new AbortController();
  // An upload is bigger than any JSON body; give it longer on a slow network.
  const timer = setTimeout(() => controller.abort(), body instanceof RawBody ? TIMEOUT_MS * 4 : TIMEOUT_MS);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body instanceof RawBody) headers["Content-Type"] = body.contentType;
  else if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokens?.token) headers.Authorization = `Bearer ${tokens.token}`;

  const payload =
    body === undefined ? {} : { body: body instanceof RawBody ? body.data : JSON.stringify(body) };

  try {
    return await fetch(`${BASE_URL}/v1${path}`, {
      method,
      headers,
      signal: controller.signal,
      ...payload,
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
      // THROUGH setTokens, not a bare assignment: that is what persists the
      // rotated pair. Assigning `tokens` directly kept the new refresh token in
      // memory only, so the next cold start replayed the old one — which the
      // server treats as theft and answers by revoking the session.
      setTokens({ token: next.token, refreshToken: next.refreshToken });
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

/** POST a raw body (a voice clip), with the same refresh-once rule as `http`. */
export async function upload<T>(path: string, data: Blob, contentType: string): Promise<T> {
  return http<T>("POST", path, new RawBody(data, contentType));
}

/** Seconds since the epoch at which a JWT expires, or null if unreadable. */
function jwtExpiry(token: string): number | null {
  try {
    const part = token.split(".")[1] ?? "";
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/**
 * An access token that will still be valid for the next minute, refreshing
 * first if it would not.
 *
 * For requests this module does NOT make — the audio player fetches a voice
 * clip itself, so it cannot take part in the refresh-on-401 above, and a
 * 15-minute token would otherwise leave old clips unplayable.
 */
export async function validAccessToken(): Promise<string | null> {
  const token = tokens?.token;
  if (!token) return null;

  const exp = jwtExpiry(token);
  if (exp !== null && exp * 1000 - Date.now() < 60_000) await refresh();
  return tokens?.token ?? null;
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
