/**
 * The one way the panel talks to the server.
 *
 * - `credentials: "include"` sends the HttpOnly session cookie; the token is
 *   never visible to script, so there is nothing here to store or leak.
 * - `X-Admin-Request` is the CSRF header the server requires on every admin
 *   route.
 * - A 401 from any call means the session is gone, so `onUnauthorized` fires
 *   and the auth provider sends the operator back to the sign-in page.
 */

const BASE = `${(import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "")}/v1/admin`;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

type Method = "GET" | "POST" | "PATCH";
type Query = Record<string, string | number | undefined>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") params.set(k, String(v));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(method: Method, path: string, body?: unknown, query?: Query): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${withQuery(path, query)}`, {
      method,
      credentials: "include",
      headers: { "X-Admin-Request": "1", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : null,
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check your connection.");
  }

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/login")) unauthorizedHandler?.();
    throw new ApiError(res.status, data?.error?.code ?? "server", data?.error?.message ?? "Something went wrong.");
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
};
