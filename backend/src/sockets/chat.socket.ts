/**
 * Live chat over the socket.
 *
 * Every handler here calls the SAME service the REST route calls. That is the
 * point: a rule enforced in one path and forgotten in the other is how a
 * socket becomes a way around the match gate. `threads.service` owns
 * membership, and both doors go through it.
 *
 * Typing is the one thing with no REST equivalent, because it is ephemeral by
 * nature and there is nothing to persist.
 */

import { key, redis } from "@/config/redis.js";
import { socketErrorBody } from "@/errors/ApiError.js";
import { consumeBucket } from "@/middlewares/rateLimit.js";
import { logger } from "@/config/logger.js";
import { toMessage, toThread } from "@/serializers/thread.serializer.js";
import * as threads from "@/services/threads.service.js";
import { emitMessage, emitReceipt, emitTyping } from "@/sockets/emitters.js";
import type { AppSocket } from "@/sockets/io.js";
import { threadRoom } from "@/sockets/rooms.js";

/** Self-expiring, so a dropped socket cannot leave someone "typing…" forever. */
const TYPING_TTL_SEC = 6;

type Ack = (result: unknown) => void;

/** Mirrors the HTTP envelope so a client has one error shape, not two. */
const fail = (code: string, message: string) => ({ error: { code, message } });

export function registerChatHandlers(socket: AppSocket): void {
  const user = socket.user;
  if (!user) return;
  const userId = String(user._id);

  /**
   * Join a conversation's room.
   *
   * Membership is re-checked here, not trusted from the client: a socket that
   * could join any room by id would receive every typing signal in the system.
   */
  socket.on("thread:subscribe", async (payload: { threadId?: string }, ack?: Ack) => {
    try {
      const threadId = String(payload?.threadId ?? "");
      await threads.getThread(user, threadId);
      await socket.join(threadRoom(threadId));
      ack?.({ ok: true });
    } catch {
      ack?.(fail("notFound", "That conversation is not available."));
    }
  });

  socket.on("thread:unsubscribe", async (payload: { threadId?: string }, ack?: Ack) => {
    const threadId = String(payload?.threadId ?? "");
    await socket.leave(threadRoom(threadId));
    ack?.({ ok: true });
  });

  /**
   * Send without a round trip through REST.
   *
   * The ack carries the stored message, which is what turns the client's
   * optimistic `sending` into `sent` in one trip rather than two.
   */
  socket.on("message:send", async (payload: { threadId?: string; body?: string; clientMessageId?: string }, ack?: Ack) => {
    // The same bucket and key as `POST /threads/:id/messages`, so the socket is
    // not a way around the REST limit.
    if (!(await consumeBucket("message-send", `u:${userId}`))) {
      ack?.(fail("rateLimited", "You're sending messages too quickly. Wait a moment."));
      return;
    }
    // A string or nothing — an object here would reach a Mongo filter.
    const clientMessageId =
      typeof payload?.clientMessageId === "string" ? payload.clientMessageId.slice(0, 64) : undefined;
    try {
      const sent = await threads.sendMessage(
        user,
        String(payload?.threadId ?? ""),
        String(payload?.body ?? ""),
        clientMessageId,
      );

      const wire = toMessage(sent.message, sent.thread, userId);
      ack?.({ message: wire });

      emitMessage(
        (sent.thread.participantIds ?? []).map(String),
        String(sent.thread._id),
        wire,
      );
    } catch (e) {
      ack?.(socketErrorBody(e));
    }
  });

  socket.on("message:read", async (payload: { threadId?: string }) => {
    try {
      const thread = await threads.markRead(user, String(payload?.threadId ?? ""));
      const other = (thread.participantIds ?? []).map(String).find((id) => id !== userId);

      // One receipt, not one per message.
      if (other) {
        emitReceipt(other, String(thread._id), { userId, readAt: new Date().toISOString() });
      }
    } catch (e) {
      logger.warn({ err: e, userId }, "socket read receipt failed");
    }
  });

  /**
   * Only into a room this socket has JOINED — `thread:subscribe` is where
   * membership was checked. Without this, anyone could fake typing into any
   * thread whose id they knew, including a blocked person into the blocker's.
   */
  const joinedThread = (payload: { threadId?: string } | undefined): string | null => {
    const threadId = String(payload?.threadId ?? "");
    return threadId.length > 0 && threadId.length <= 64 && socket.rooms.has(threadRoom(threadId)) ? threadId : null;
  };

  socket.on("typing:start", (payload: { threadId?: string }) => {
    const threadId = joinedThread(payload);
    if (!threadId) return;
    // Best effort, and self-expiring — nothing downstream depends on it.
    void redis.set(key(`typing:${threadId}:${userId}`), "1", "EX", TYPING_TTL_SEC);
    emitTyping(threadId, userId, true);
  });

  socket.on("typing:stop", (payload: { threadId?: string }) => {
    const threadId = joinedThread(payload);
    if (!threadId) return;
    void redis.del(key(`typing:${threadId}:${userId}`));
    emitTyping(threadId, userId, false);
  });

  // Exported for the REST path, which has no socket to answer on.
  void toThread;
}
