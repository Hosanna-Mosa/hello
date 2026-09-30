/**
 * The three API calls the website makes — all for deleting an account from
 * the web, using the same endpoints the app uses:
 *
 *   POST /v1/auth/code    send a one-time code to the phone
 *   POST /v1/auth/verify  prove ownership, receive a short-lived token
 *   DELETE /v1/me         request deletion with that token
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

export type Phone = { countryCode: string; phoneNumber: string };

export const accountApi = {
  sendCode: (phone: Phone) => call<{ resendAfterSec: number }>("POST", "/auth/code", phone),
  verify: (phone: Phone, code: string) =>
    call<{ token: string }>("POST", "/auth/verify", {
      ...phone,
      code,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  requestDeletion: (token: string, reason?: string) =>
    call<void>("DELETE", "/me", reason ? { reason } : {}, token),
};
