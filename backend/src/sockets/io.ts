/**
 * The Socket.IO server.
 *
 * Attached to the same HTTP server as the REST API, so there is one port, one
 * TLS terminator and one origin — and the token that authenticates a request
 * authenticates a socket.
 *
 * The Redis adapter is what makes more than one Node process possible: without
 * it, a message emitted on instance A never reaches a socket held by instance
 * B, and the bug only appears once you scale past one.
 */

import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server, type Socket } from "socket.io";

import { adminOrigins, corsOrigins } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { redis } from "@/config/redis.js";
import type { UserDoc } from "@/models/user.model.js";
import { registerAdminNamespace } from "@/sockets/admin.socket.js";
import { authenticateSocket } from "@/sockets/auth.socket.js";
import { registerChatHandlers } from "@/sockets/chat.socket.js";
import { registerCallHandlers } from "@/sockets/calls.socket.js";
import { ADMIN_NAMESPACE, adminSessionRoom, userRoom } from "@/sockets/rooms.js";
import { registerSupportHandlers } from "@/sockets/support.socket.js";

export type AppSocket = Socket & { user?: UserDoc };

let io: Server | null = null;

export async function attachSockets(server: HttpServer): Promise<Server> {
  io = new Server(server, {
    // The panel's origin too, for a deployment that serves it from its own
    // host. Nothing rides on cookies here — `/admin` authenticates with a
    // socket ticket — so CORS is a courtesy, not the security boundary.
    cors: { origin: corsOrigins === true ? true : [...corsOrigins, ...adminOrigins], credentials: false },
    // A phone on a train drops its connection constantly. Recovery replays
    // what it missed instead of making the client re-fetch the world.
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 },
  });

  // A connection in subscriber mode can issue no other command, so the adapter
  // gets its own pair rather than sharing the request-path client.
  const pub = redis.duplicate();
  const sub = redis.duplicate();
  await Promise.all([pub.connect().catch(() => {}), sub.connect().catch(() => {})]);
  io.adapter(createAdapter(pub, sub));

  io.use(authenticateSocket);

  io.on("connection", (socket: AppSocket) => {
    const userId = String(socket.user?._id);
    void socket.join(userRoom(userId));

    logger.info(
      { userId, socketId: socket.id, recovered: socket.recovered },
      "[socket] connected (recovered = resumed a short drop without re-auth)",
    );

    registerChatHandlers(socket);
    registerCallHandlers(socket);
    registerSupportHandlers(socket);

    socket.on("disconnect", (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, "[socket] disconnected");
    });
  });

  // The admin panel, on its own namespace with its own auth — `io.use` above
  // applies to `/` only, so an app token opens nothing here and vice versa.
  registerAdminNamespace(io.of(ADMIN_NAMESPACE));

  return io;
}

/** Close one operator session's sockets — called when that session signs out. */
export function disconnectAdminSession(jti: string): void {
  io?.of(ADMIN_NAMESPACE).in(adminSessionRoom(jti)).disconnectSockets(true);
}

/**
 * The emitter used by REST handlers and jobs.
 *
 * Returns null before `attachSockets` runs — in tests, and during the window
 * between boot and listen. Callers must treat a socket emit as best-effort:
 * the durable record is already in MongoDB, and the event is only how a client
 * finds out sooner.
 */
export function getIo(): Server | null {
  return io;
}

export async function closeSockets(): Promise<void> {
  await io?.close();
  io = null;
}
