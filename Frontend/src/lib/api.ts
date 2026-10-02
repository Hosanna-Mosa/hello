/**
 * The API calls the website makes — all for deleting an account from the web,
 * using the same endpoints the app uses:
 *
 *   POST /v1/auth/login    email or phone + password, the app's own sign-in.
 *                          It never creates an account, and it is rate limited
 *                          per IP and per account on the server.
 *   DELETE /v1/me          delete instantly with that token
 *   POST /v1/auth/signout  drop the token if the person backs out
 *
 * The token is held in memory for the length of the flow and never stored.
 */

const BASE = `${(import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "")}/v1`;

export class ApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function call<T>(method: "POST" | "DELETE", path: string, body: unknown, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      credentials: "omit",
    });
  } catch {
    throw new ApiError("network", "We couldn't reach our servers. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  if (!res.ok) throw new ApiError(data?.error?.code ?? "server", data?.error?.message ?? "Something went wrong. Please try again.");
  return data as T;
}

export const accountApi = {
  signIn: (identifier: string, password: string) =>
    call<{ token: string }>("POST", "/auth/login", {
      identifier: identifier.trim(),
      password,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  deleteAccount: (token: string, reason?: string) =>
    call<void>("DELETE", "/me", reason ? { reason } : {}, token),
  signOut: (token: string) => call<void>("POST", "/auth/signout", {}, token),
};
