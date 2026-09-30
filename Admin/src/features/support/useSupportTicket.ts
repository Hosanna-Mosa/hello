/**
 * One ticket, live: its conversation, the operator's sends, and Resolve.
 *
 * SENDING mirrors the app: a reply shows at once as pending, goes out over the
 * socket (REST if the socket is down or silent), and is replaced by the stored
 * copy — by `clientMessageId`, whichever arrives first, the ack or the echo. A
 * failed reply stays on screen with Retry, reusing its id so it cannot land
 * twice.
 *
 * While open, the ticket's room carries "the user is typing…", and a user
 * reply that arrives is marked read for the whole team at once.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useSocketEvent } from "@/hooks/useSocketEvent";
import { emitAdmin, getAdminSocket, onAdminEvent } from "@/lib/socket";
import { supportService } from "@/services/admin.service";
import type { AdminSupportDetail, AdminSupportMessage, AdminSupportTicket } from "@/types/admin";

export type PendingReply = { clientMessageId: string; body: string; createdAt: string; failed: boolean };

const ACK_TIMEOUT_MS = 8000;
const USER_TYPING_TTL_MS = 6000;

function merge(list: AdminSupportMessage[], incoming: AdminSupportMessage[]): AdminSupportMessage[] {
  const known = new Set(list.map((m) => m.id));
  const fresh = incoming.filter((m) => !known.has(m.id));
  if (fresh.length === 0) return list;
  return [...list, ...fresh].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

const newClientId = () => `admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Over the socket, or null if it is down or does not answer in time. Refusals reject. */
function sendLive(ticketId: string, body: string, clientMessageId: string): Promise<AdminSupportDetail | null> {
  const socket = getAdminSocket();
  if (!socket?.connected) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit(
        "support:message:send",
        { ticketId, body, clientMessageId },
        (err: Error | null, result: AdminSupportDetail | { error: { message: string } }) => {
          if (err) resolve(null);
          else if ("error" in result) reject(new Error(result.error.message));
          else resolve(result);
        },
      );
  });
}

export function useSupportTicket(ticketId: string) {
  const [ticket, setTicket] = useState<AdminSupportTicket | null>(null);
  const [messages, setMessages] = useState<AdminSupportMessage[]>([]);
  const [pending, setPending] = useState<PendingReply[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userTyping, setUserTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Fold stored messages in, and drop the pending copies they confirm. */
  const absorb = useCallback((incoming: AdminSupportMessage[]) => {
    setMessages((prev) => merge(prev, incoming));
    const confirmed = new Set(incoming.map((m) => m.clientMessageId).filter(Boolean));
    if (confirmed.size) setPending((prev) => prev.filter((p) => !confirmed.has(p.clientMessageId)));
  }, []);

  const apply = useCallback(
    (detail: AdminSupportDetail) => {
      setTicket(detail.ticket);
      absorb(detail.messages);
    },
    [absorb],
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      apply(await supportService.get(ticketId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this ticket.");
    }
  }, [apply, ticketId]);

  useEffect(() => {
    setTicket(null);
    setMessages([]);
    setPending([]);
    void load();
    emitAdmin("support:subscribe", { ticketId });
    // Rejoin on every (re)connect — rooms do not survive a dropped connection.
    const stopRejoining = onAdminEvent("connect", () => emitAdmin("support:subscribe", { ticketId }));
    return () => {
      stopRejoining();
      emitAdmin("support:unsubscribe", { ticketId });
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [load, ticketId]);

  useSocketEvent<{ ticketId: string; message: AdminSupportMessage }>("support:message:new", (e) => {
    if (e.ticketId !== ticketId) return;
    absorb([e.message]);
    if (e.message.author === "user") {
      setUserTyping(false);
      emitAdmin("support:read", { ticketId });
    }
  });

  useSocketEvent<{ ticket: AdminSupportTicket }>("support:ticket:updated", (e) => {
    if (e.ticket.id === ticketId) setTicket(e.ticket);
  });

  useSocketEvent<{ ticketId: string; author: string; isTyping: boolean }>("support:typing", (e) => {
    if (e.ticketId !== ticketId || e.author !== "user") return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setUserTyping(e.isTyping);
    if (e.isTyping) typingTimer.current = setTimeout(() => setUserTyping(false), USER_TYPING_TTL_MS);
  });

  const deliver = useCallback(
    async (reply: PendingReply) => {
      try {
        const detail =
          (await sendLive(ticketId, reply.body, reply.clientMessageId)) ??
          (await supportService.reply(ticketId, reply.body, reply.clientMessageId));
        apply(detail);
      } catch {
        setPending((prev) => prev.map((p) => (p.clientMessageId === reply.clientMessageId ? { ...p, failed: true } : p)));
      }
    },
    [apply, ticketId],
  );

  const send = useCallback(
    (body: string) => {
      const text = body.trim();
      if (!text) return;
      const reply: PendingReply = { clientMessageId: newClientId(), body: text, createdAt: new Date().toISOString(), failed: false };
      setPending((prev) => [...prev, reply]);
      void deliver(reply);
    },
    [deliver],
  );

  const retry = useCallback(
    (clientMessageId: string) => {
      const found = pending.find((p) => p.clientMessageId === clientMessageId);
      if (!found) return;
      const again = { ...found, failed: false };
      setPending((prev) => prev.map((p) => (p.clientMessageId === clientMessageId ? again : p)));
      void deliver(again);
    },
    [deliver, pending],
  );

  const discard = useCallback((clientMessageId: string) => {
    setPending((prev) => prev.filter((p) => p.clientMessageId !== clientMessageId));
  }, []);

  /** Ask the user to confirm it's fixed. Throws so the dialog can show why. */
  const resolve = useCallback(async () => {
    apply(await supportService.resolve(ticketId));
  }, [apply, ticketId]);

  const emitTyping = useCallback((isTyping: boolean) => emitAdmin("support:typing", { ticketId, isTyping }), [ticketId]);

  return { ticket, messages, pending, error, userTyping, reload: load, send, retry, discard, resolve, emitTyping };
}
