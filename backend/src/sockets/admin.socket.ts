/**
 * The admin panel's live connection: namespace `/admin`.
 *
 * AUTH. The handshake carries a one-minute socket ticket (see
 * `adminAuth.service.issueSocketTicket`), never the session cookie. The ticket
 * is bound to a live session, and the socket is closed:
 *
 *   - when that session signs out (`disconnectAdminSession`, from logout), and
 *   - when that session would have expired, by a timer set at connect.
 *
 * So an operator's socket can never outlive their right to use the panel.
 *
 * ROOMS. Every operator joins `admins`, where durable support events land, so
 * every open panel's queue updates live. Opening a ticket joins its
 * `support:<id>` room for typing.
 */

import type { Namespace, Socket } from "socket.io";
import type { ExtendedError } from "socket.io";

import { logger } from "@/config/logger.js";
import type { AdminDoc } from "@/models/admin.model.js";
import { toAdminSupportMessage, toAdminSupportTicket } from "@/serializers/support.serializer.js";
import { authenticateSocketTicket } from "@/services/adminAuth.service.js";
import * as support from "@/services/support.service.js";
import { emitSupportTyping, emitSupportUpdate } from "@/sockets/emitters.js";
import { ADMINS_ROOM, adminSessionRoom, supportRoom } from "@/sockets/rooms.js";
import { socketSendSchema, socketTicketSchema, socketTypingSchema } from "@/validators/support.validator.js";

type AdminSocket = Socket & { data: { admin?: AdminDoc; jti?: string; sessionMsLeft?: number } };
type Ack = (result: unknown) => void;

/** setTimeout's ceiling (~24.8 days); a session is 8 hours, but never overflow. */
const MAX_TIMER_MS = 2_147_483_647;

function refuse(message: string): ExtendedError {
  const err = new Error(message) as ExtendedError;
  err.data = { error: { code: "unauthorized", message } };
  return err;
}

const fail = (e: unknown) => ({
  error: {
    code: (e as { code?: string }).code ?? "server",
    message: (e as { code?: string }).code ? (e as Error).message : "Something went wrong.",
  },
});

export function registerAdminNamespace(ns: Namespace): void {
  ns.use(async (socket: AdminSocket, next) => {
    try {
      const raw = socket.handshake.auth?.token;
      if (typeof raw !== "string" || !raw) return next(refuse("Sign in to connect."));
      const { admin, jti, sessionMsLeft } = await authenticateSocketTicket(raw);
      socket.data = { admin, jti, sessionMsLeft };
      next();
    } catch {
      logger.warn({ socketId: socket.id }, "[admin-socket] handshake REFUSED");
      next(refuse("Please sign in again."));
    }
  });

  ns.on("connection", (socket: AdminSocket) => {
    const { admin, jti, sessionMsLeft } = socket.data;
    if (!admin || !jti) {
      socket.disconnect(true);
      return;
    }

    void socket.join(ADMINS_ROOM);
    void socket.join(adminSessionRoom(jti));

    // The session's own expiry, enforced on the socket too.
    const expiry = setTimeout(() => socket.disconnect(true), Math.min(sessionMsLeft ?? 0, MAX_TIMER_MS));
    socket.on("disconnect", () => clearTimeout(expiry));

    logger.info({ adminId: String(admin._id), socketId: socket.id }, "[admin-socket] connected");

    socket.on("support:subscribe", async (payload: unknown, ack?: Ack) => {
      const parsed = socketTicketSchema.safeParse(payload);
      if (!parsed.success || !(await support.ticketExists(parsed.data.ticketId))) {
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

      try {
        const { ticketId, body, clientMessageId } = parsed.data;
        const result = await support.sendAdminMessage(admin, ticketId, body, clientMessageId);
        const owner = await support.ownerSummary(result.ticket);
        ack?.({
          ticket: toAdminSupportTicket(result.ticket, owner),
          messages: result.messages.map(toAdminSupportMessage),
        });
        emitSupportUpdate(result.ticket, result.messages, owner);
      } catch (e) {
        ack?.(fail(e));
      }
    });

    /** The operator has the ticket on screen, so the team's unread badge clears everywhere. */
    socket.on("support:read", async (payload: unknown) => {
      const parsed = socketTicketSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const ticket = await support.markReadByAdmin(parsed.data.ticketId);
        emitSupportUpdate(ticket, [], await support.ownerSummary(ticket));
      } catch {
        // A read marker is not worth an error.
      }
    });

    socket.on("support:typing", (payload: unknown) => {
      const parsed = socketTypingSchema.safeParse(payload);
      if (!parsed.success || !socket.rooms.has(supportRoom(parsed.data.ticketId))) return;
      emitSupportTyping(parsed.data.ticketId, "admin", parsed.data.isTyping);
    });
  });
}
