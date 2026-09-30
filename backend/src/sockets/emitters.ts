/**
 * How the rest of the server reaches connected clients.
 *
 * Every emit is BEST EFFORT. The durable record is already in MongoDB by the
 * time these run; a socket event is only how a client finds out sooner. So a
 * missing `io` (before boot, in tests) is a no-op rather than an error, and no
 * caller has to guard.
 *
 * There is deliberately no `requestDeclined` emitter, and there never will be.
 * A18 says a declined message request must not be inferable by the sender —
 * that is enforced by the absence of a channel, not by remembering not to call
 * one.
 */

import type { SupportMessageDoc } from "@/models/supportMessage.model.js";
import type { SupportTicketDoc } from "@/models/supportTicket.model.js";
import {
  toAdminSupportMessage,
  toAdminSupportTicket,
  toSupportMessage,
  toSupportTicket,
  type SupportUserSummary,
} from "@/serializers/support.serializer.js";
import type { AppNotification, Match, Message, SupportAuthor, Thread } from "@/types/wire.js";
import { getIo } from "@/sockets/io.js";
import { ADMIN_NAMESPACE, ADMINS_ROOM, supportRoom, threadRoom, userRoom } from "@/sockets/rooms.js";

function toUsers(userIds: string[], event: string, payload: unknown): void {
  const io = getIo();
  if (!io) return;
  for (const id of userIds) io.to(userRoom(id)).emit(event, payload);
}

/** A new message, to every participant's devices — including the sender's others. */
export function emitMessage(participantIds: string[], threadId: string, message: Message): void {
  toUsers(participantIds, "message:new", { threadId, message });
}

/**
 * A read or delivered receipt.
 *
 * ONE event per receipt, not one per message: marking 200 messages read is a
 * single cursor move, and fanning that out as 200 events would be the same
 * mistake as storing status per message.
 */
export function emitReceipt(toUserId: string, threadId: string, receipt: { readAt?: string; deliveredAt?: string; userId: string }): void {
  toUsers([toUserId], "thread:receipt", { threadId, ...receipt });
}

export function emitReaction(participantIds: string[], threadId: string, message: Message): void {
  toUsers(participantIds, "message:reaction", { threadId, messageId: message.id, reactions: message.reactions });
}

/** Typing goes to the THREAD room — it is meaningless to someone not looking. */
export function emitTyping(threadId: string, userId: string, isTyping: boolean): void {
  const io = getIo();
  if (!io) return;
  io.to(threadRoom(threadId)).emit("typing", { threadId, userId, isTyping });
}

export function emitMatch(userIds: string[], match: Match, thread: Thread | null): void {
  toUsers(userIds, "match:new", { match, thread });
}

export function emitRequest(toUserId: string, request: unknown): void {
  toUsers([toUserId], "request:new", { request });
}

/** Unmatch — the thread is gone for both sides. */
export function emitThreadEnded(userIds: string[], threadId: string, matchId: string): void {
  toUsers(userIds, "thread:ended", { threadId, matchId });
}

export function emitNotification(toUserId: string, notification: AppNotification): void {
  toUsers([toUserId], "notification:new", notification);
}

// --- calls -----------------------------------------------------------------

export function emitIncomingCall(toUserId: string, payload: unknown): void {
  toUsers([toUserId], "call:incoming", payload);
}

export function emitCallAccepted(toUserId: string, callId: string): void {
  toUsers([toUserId], "call:accepted", { callId });
}

/**
 * Relay one WebRTC signalling message to the other person on a call.
 *
 * Deliberately ONE channel rather than `call:offer` / `call:answer` /
 * `call:ice`: the server has no business understanding any of them. It checks
 * that the sender is on the call and passes the payload through untouched,
 * which is the whole of its job and the only part that can be got wrong.
 */
export function emitCallSignal(
  toUserId: string,
  payload: { callId: string; kind: "offer" | "answer" | "ice"; data: unknown; fromUserId: string },
): void {
  toUsers([toUserId], "call:signal", payload);
}

export function emitCallEnded(userIds: string[], payload: unknown): void {
  toUsers(userIds, "call:ended", payload);
}

// --- support ---------------------------------------------------------------

/**
 * A support ticket changed: tell the user who owns it and every connected
 * operator, each in their own shape.
 *
 * ONE function for every support write — a message, a resolve request, the
 * user's answer — so the two sides can never drift: whatever one sees, the
 * other sees in the same beat. Messages go first, then the ticket, so a list
 * that re-sorts on `ticket:updated` already has the message it is sorting by.
 *
 * The user's other devices get it too (the sender's included), which is how a
 * reply typed on the phone appears on the tablet.
 */
export function emitSupportUpdate(
  ticket: SupportTicketDoc,
  messages: SupportMessageDoc[],
  owner: SupportUserSummary | null,
): void {
  const io = getIo();
  if (!io) return;

  const ticketId = String(ticket._id);
  const user = io.to(userRoom(String(ticket.userId)));
  const admins = io.of(ADMIN_NAMESPACE).to(ADMINS_ROOM);

  for (const message of messages) {
    user.emit("support:message:new", { ticketId, message: toSupportMessage(message) });
    admins.emit("support:message:new", { ticketId, message: toAdminSupportMessage(message) });
  }
  user.emit("support:ticket:updated", { ticket: toSupportTicket(ticket) });
  admins.emit("support:ticket:updated", { ticket: toAdminSupportTicket(ticket, owner) });
}

/** "Support is typing…" / "the user is typing…" — to whoever has the ticket open, on both sides. */
export function emitSupportTyping(ticketId: string, author: Exclude<SupportAuthor, "system">, isTyping: boolean): void {
  const io = getIo();
  if (!io) return;
  const payload = { ticketId, author, isTyping };
  io.to(supportRoom(ticketId)).emit("support:typing", payload);
  io.of(ADMIN_NAMESPACE).to(supportRoom(ticketId)).emit("support:typing", payload);
}
