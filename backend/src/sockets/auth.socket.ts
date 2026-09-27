/**
 * Socket handshake auth.
 *
 * The token arrives in `handshake.auth`, NEVER the query string. A query
 * string lands in proxy access logs, browser history and error reports — and
 * an access token written to any of those is a credential leak that no amount
 * of TLS prevents.
 *
 * The same checks as the REST middleware, in the same order, because a socket
 * that outlives a sign-out is exactly the hole `denylistAccess` exists to
 * close.
 */

import type { ExtendedError } from "socket.io";

import { UserModel } from "@/models/user.model.js";
import { isAccessDenylisted, verifyAccess } from "@/services/token.service.js";
import type { AppSocket } from "@/sockets/io.js";

/** Socket.IO surfaces `err.data` to the client; the shape mirrors the REST envelope. */
function refuse(message: string): ExtendedError {
  const err = new Error(message) as ExtendedError;
  err.data = { error: { code: "unauthorized", message } };
  return err;
}

export async function authenticateSocket(
  socket: AppSocket,
  next: (err?: ExtendedError) => void,
): Promise<void> {
  try {
    const raw = socket.handshake.auth?.token;
    const token = typeof raw === "string" ? raw.replace(/^Bearer\s+/i, "").trim() : "";
    if (!token) return next(refuse("Sign in to connect."));

    const claims = verifyAccess(token);
    if (await isAccessDenylisted(claims.jti)) return next(refuse("Please sign in again."));

    const user = await UserModel.findById(claims.sub);
    // Same rule as HTTP: the account's state is the authority, not the
    // signature. A socket opened before deletion must not survive it.
    if (!user || user.status !== "active") return next(refuse("Please sign in again."));

    socket.user = user;
    next();
  } catch {
    next(refuse("Sign in to connect."));
  }
}
