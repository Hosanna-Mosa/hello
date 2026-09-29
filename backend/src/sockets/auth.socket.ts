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

import { logger } from "@/config/logger.js";
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
    if (!token) {
      logger.warn({ socketId: socket.id }, "[socket] handshake REFUSED — no token");
      return next(refuse("Sign in to connect."));
    }

    const claims = verifyAccess(token);
    if (await isAccessDenylisted(claims.jti)) {
      logger.warn({ socketId: socket.id, userId: claims.sub }, "[socket] handshake REFUSED — token signed out");
      return next(refuse("Please sign in again."));
    }

    const user = await UserModel.findById(claims.sub);
    // Same rule as HTTP: the account's state is the authority, not the
    // signature. A socket opened before deletion must not survive it.
    if (!user || user.status !== "active") {
      logger.warn({ socketId: socket.id, userId: claims.sub }, "[socket] handshake REFUSED — account not active");
      return next(refuse("Please sign in again."));
    }

    socket.user = user;
    next();
  } catch (e) {
    // Almost always an EXPIRED access token — the client should refresh and
    // reconnect (app/src/services/socket.ts does, since PLAN #223).
    logger.warn({ socketId: socket.id, err: (e as Error).message }, "[socket] handshake REFUSED — invalid or expired token");
    next(refuse("Sign in to connect."));
  }
}
