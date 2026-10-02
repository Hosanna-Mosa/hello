/**
 * Support chat over the app's socket (namespace `/`).
 *
 * Same principle as `chat.socket.ts`: every handler calls the SAME service the
 * REST route calls, so the socket is a faster door, not a different set of
 * rules. Payloads are parsed with the REST validators.
 *
 * `support:message:send` acks with what REST would have returned — the ticket
 * and the stored message(s) — which is what lets the app turn its optimistic
 * bubble into the real one in a single trip.
 */

import { logger } from "@/config/logger.js";
import { socketErrorBody } from "@/errors/ApiError.js";
import { consumeBucket } from "@/middlewares/rateLimit.js";
import { toSupportMessage, toSupportTicket } from "@/serializers/support.serializer.js";
import * as support from "@/services/support.service.js";
import { emitSupportTyping, emitSupportUpdate } from "@/sockets/emitters.js";
import type { AppSocket } from "@/sockets/io.js";
import { supportRoom } from "@/sockets/rooms.js";
import { socketSendSchema, socketTicketSchema, socketTypingSchema } from "@/validators/support.validator.js";

type Ack = (result: unknown) => void;

/** Mirrors the HTTP envelope so the client has one error shape, not two. */
const fail = (e: unknown) => socketErrorBody(e);

export function registerSupportHandlers(socket: AppSocket): void {
  const user = socket.user;
  if (!user) return;

  /** Join a ticket's room for typing. Ownership is checked, never trusted. */
  socket.on("support:subscribe", async (payload: unknown, ack?: Ack) => {
    const parsed = socketTicketSchema.safeParse(payload);
    if (!parsed.success || !(await support.userOwnsTicket(user, parsed.data.ticketId))) {
      ack?.({ error: { code: "notFound", message: "That ticket doesn't exist." } });
      return;
    }
    await socket.join(supportRoom(parsed.data.ticketId));
    ack?.({ ok: true });
  });

  socket.on("support:unsubscribe", async (payload: unknown, ack?: Ack) => {
    const parsed = socketTicketSchema.safeParse(payload);
    if (parsed.success) await socket.leave(supportRoom(parsed.data.ticketId));
    ack?.({ ok: true });
  });

  socket.on("support:message:send", async (payload: unknown, ack?: Ack) => {
    const parsed = socketSendSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: { code: "validation", message: parsed.error.issues[0]?.message ?? "That message isn't valid." } });
      return;
    }

    if (!(await consumeBucket("message-send", `u:${String(user._id)}`))) {
      ack?.({ error: { code: "rateLimited", message: "You're sending messages too quickly. Wait a moment." } });
      return;
    }

    try {
      const { ticketId, body, clientMessageId } = parsed.data;
      const result = await support.sendUserMessage(user, ticketId, body, clientMessageId);
      ack?.({ ticket: toSupportTicket(result.ticket), messages: result.messages.map(toSupportMessage) });
      emitSupportUpdate(result.ticket, result.messages, support.summaryOfUser(user));
    } catch (e) {
      logger.warn({ err: (e as Error).message, userId: String(user._id) }, "[support] socket send refused");
      ack?.(fail(e));
    }
  });

  socket.on("support:typing", async (payload: unknown) => {
    const parsed = socketTypingSchema.safeParse(payload);
    if (!parsed.success) return;
    // Only into a room this socket joined — which required owning the ticket.
    if (!socket.rooms.has(supportRoom(parsed.data.ticketId))) return;
    emitSupportTyping(parsed.data.ticketId, "user", parsed.data.isTyping);
  });
}
