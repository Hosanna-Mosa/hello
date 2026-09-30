/**
 * The two cookie operations the admin session needs, without a dependency.
 */

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

type CookieOptions = { maxAgeSec: number; path: string; secure: boolean };

/** Always HttpOnly + SameSite=Strict: script cannot read it, other sites cannot send it. */
export function serializeCookie(name: string, value: string, opts: CookieOptions): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Max-Age=${Math.max(0, Math.floor(opts.maxAgeSec))}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}
