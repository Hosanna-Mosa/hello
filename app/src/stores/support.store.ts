/**
 * Support tickets and their conversations.
 *
 * SENDING IS OPTIMISTIC. A message appears the instant it is sent, dimmed,
 * as a `PendingSend` keyed by its `clientMessageId`. The server's copy
 * replaces it — whichever arrives first, the send's response or the socket
 * echo. A send that fails stays on screen, marked, with a retry that reuses
 * the same `clientMessageId`, so a retry of a send that actually landed is
 * stored once. Support is where losing someone's message silently would do
 * the most damage, so nothing here drops one.
 *
 * Every merge is BY ID and returns new objects — never an in-place mutation
 * (React Compiler, AGENTS.md).
 */

import { create } from "zustand";

import { isMockMode, nextId } from "@/services/client";
import { onSocket } from "@/services/socket";
import { supportService, type NewTicketInput } from "@/services/support.service";
import type { SupportMessage, SupportTicket, SupportTicketDetail } from "@/services/types";

export type PendingSend = {
  clientMessageId: string;
  body: string;
  createdAt: string;
  failed: boolean;
};

export type SupportState = {
  tickets: SupportTicket[];
  /** Keyed by ticket id. Present once a ticket has been opened. */
  messages: Record<string, SupportMessage[]>;
  pending: Record<string, PendingSend[]>;
  drafts: Record<string, string>;
  /** Support is typing in this ticket. */
  typing: Record<string, boolean>;
  loading: boolean;
  error: unknown;

  loadTickets: () => Promise<void>;
  createTicket: (input: NewTicketInput) => Promise<SupportTicket>;
  openTicket: (ticketId: string) => Promise<void>;
  send: (ticketId: string, body: string) => Promise<void>;
  retry: (ticketId: string, clientMessageId: string) => Promise<void>;
  discard: (ticketId: string, clientMessageId: string) => void;
  respondToResolution: (ticketId: string, accept: boolean) => Promise<void>;
  markRead: (ticketId: string) => Promise<void>;
  setDraft: (ticketId: string, draft: string) => void;
  /** Dev/mock only: play the support side asking to resolve. */
  simulateResolutionRequest: (ticketId: string) => void;
};

// ---------------------------------------------------------------------------
// Pure merges
// ---------------------------------------------------------------------------

const byTime = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

/** Add messages the list does not have yet, keeping it in time order. */
export function mergeMessages(list: SupportMessage[], incoming: SupportMessage[]): SupportMessage[] {
  const known = new Set(list.map((m) => m.id));
  const fresh = incoming.filter((m) => !known.has(m.id));
  return fresh.length === 0 ? list : [...list, ...fresh].sort(byTime);
}

/** Replace a ticket by id (or add it), most recent activity first. */
export function upsertTicket(list: SupportTicket[], ticket: SupportTicket): SupportTicket[] {
  const others = list.filter((t) => t.id !== ticket.id);
  return [ticket, ...others].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

/** Drop the optimistic copies the server has now confirmed. */
function withoutConfirmed(pending: PendingSend[], confirmed: SupportMessage[]): PendingSend[] {
  const ids = new Set(confirmed.map((m) => m.clientMessageId).filter(Boolean));
  return ids.size === 0 ? pending : pending.filter((p) => !ids.has(p.clientMessageId));
}

/** Fold a server response or event into the store. */
function applyDetail(state: SupportState, detail: SupportTicketDetail): Partial<SupportState> {
  const id = detail.ticket.id;
  return {
    tickets: upsertTicket(state.tickets, detail.ticket),
    messages: { ...state.messages, [id]: mergeMessages(state.messages[id] ?? [], detail.messages) },
    pending: { ...state.pending, [id]: withoutConfirmed(state.pending[id] ?? [], detail.messages) },
  };
}

// ---------------------------------------------------------------------------
// Mock theatre — a scripted agent, so the flow works with no server
// ---------------------------------------------------------------------------

const MOCK_TYPING_MS = 1800;

function scheduleMockReply(ticketId: string): void {
  if (!isMockMode()) return;
  setTimeout(() => {
    useSupportStore.setState((s) => ({ typing: { ...s.typing, [ticketId]: true } }));
  }, 600);
  setTimeout(() => {
    const reply = supportService.mockSupportReplySync(ticketId);
    useSupportStore.setState((s) => ({
      ...(reply ? applyDetail(s, reply) : {}),
      typing: { ...s.typing, [ticketId]: false },
    }));
  }, 600 + MOCK_TYPING_MS);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSupportStore = create<SupportState>((set, get) => {
  /** One send attempt for a pending message. Marks it failed rather than dropping it. */
  async function deliver(ticketId: string, pending: PendingSend): Promise<void> {
    try {
      const detail = await supportService.sendMessage(ticketId, pending.body, pending.clientMessageId);
      set((s) => applyDetail(s, detail));
      scheduleMockReply(ticketId);
    } catch (error) {
      set((s) => ({
        pending: {
          ...s.pending,
          [ticketId]: (s.pending[ticketId] ?? []).map((p) =>
            p.clientMessageId === pending.clientMessageId ? { ...p, failed: true } : p,
          ),
        },
      }));
      throw error;
    }
  }

  return {
    tickets: [],
    messages: {},
    pending: {},
    drafts: {},
    typing: {},
    loading: false,
    error: null,

    loadTickets: async () => {
      set({ loading: true, error: null });
      try {
        set({ tickets: await supportService.listTickets() });
      } catch (error) {
        set({ error });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    createTicket: async (input) => {
      const detail = await supportService.createTicket(input);
      set((s) => applyDetail(s, detail));
      scheduleMockReply(detail.ticket.id);
      return detail.ticket;
    },

    openTicket: async (ticketId) => {
      const detail = await supportService.getTicket(ticketId);
      set((s) => ({
        tickets: upsertTicket(s.tickets, detail.ticket),
        // A full load is authoritative, but keep anything a socket event
        // delivered while the request was in flight.
        messages: { ...s.messages, [ticketId]: mergeMessages(detail.messages, s.messages[ticketId] ?? []) },
        pending: { ...s.pending, [ticketId]: withoutConfirmed(s.pending[ticketId] ?? [], detail.messages) },
      }));
    },

    send: async (ticketId, body) => {
      const text = body.trim();
      if (!text) return;

      const pending: PendingSend = {
        clientMessageId: nextId("smsg-client"),
        body: text,
        createdAt: new Date().toISOString(),
        failed: false,
      };
      set((s) => ({
        pending: { ...s.pending, [ticketId]: [...(s.pending[ticketId] ?? []), pending] },
        drafts: { ...s.drafts, [ticketId]: "" },
      }));

      await deliver(ticketId, pending);
    },

    retry: async (ticketId, clientMessageId) => {
      const found = (get().pending[ticketId] ?? []).find((p) => p.clientMessageId === clientMessageId);
      if (!found) return;
      const again = { ...found, failed: false };
      set((s) => ({
        pending: {
          ...s.pending,
          [ticketId]: (s.pending[ticketId] ?? []).map((p) => (p.clientMessageId === clientMessageId ? again : p)),
        },
      }));
      await deliver(ticketId, again);
    },

    discard: (ticketId, clientMessageId) =>
      set((s) => ({
        pending: {
          ...s.pending,
          [ticketId]: (s.pending[ticketId] ?? []).filter((p) => p.clientMessageId !== clientMessageId),
        },
      })),

    respondToResolution: async (ticketId, accept) => {
      const detail = await supportService.respondToResolution(ticketId, accept);
      set((s) => applyDetail(s, detail));
    },

    markRead: async (ticketId) => {
      const ticket = await supportService.markRead(ticketId);
      set((s) => ({ tickets: upsertTicket(s.tickets, ticket) }));
    },

    setDraft: (ticketId, draft) => set((s) => ({ drafts: { ...s.drafts, [ticketId]: draft } })),

    simulateResolutionRequest: (ticketId) => {
      const detail = supportService.mockRequestResolutionSync(ticketId);
      if (detail) set((s) => applyDetail(s, detail));
    },
  };
});

/** Tickets with a reply you have not read — for the Help entry's badge. */
export function unreadTicketCount(tickets: SupportTicket[]): number {
  return tickets.filter((t) => t.unreadCount > 0 && t.status !== "resolved").length;
}

// ---------------------------------------------------------------------------
// Live events — registered at module load, bound when the socket connects
// (see `onSocket` in services/socket.ts). No-ops in mock mode.
// ---------------------------------------------------------------------------

/** A support reply — or your own message echoed from another device. */
export function receiveSupportMessage(ticketId: string, message: SupportMessage): void {
  useSupportStore.setState((s) => {
    const loaded = s.messages[ticketId];
    return {
      // Only into a conversation already loaded: a partial history for one
      // that is not would be worse than loading it whole when it opens.
      ...(loaded ? { messages: { ...s.messages, [ticketId]: mergeMessages(loaded, [message]) } } : {}),
      pending: { ...s.pending, [ticketId]: withoutConfirmed(s.pending[ticketId] ?? [], [message]) },
      // A reply ends "typing…".
      ...(message.author === "admin" ? { typing: { ...s.typing, [ticketId]: false } } : {}),
    };
  });
}

onSocket("support:message:new", ({ ticketId, message }) => receiveSupportMessage(ticketId, message));

onSocket("support:ticket:updated", ({ ticket }) => {
  useSupportStore.setState((s) => ({ tickets: upsertTicket(s.tickets, ticket) }));
});

/** "Typing…" self-clears, so a dropped connection cannot leave it on forever. */
const TYPING_TTL_MS = 6000;
const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};

onSocket("support:typing", ({ ticketId, author, isTyping }) => {
  if (author !== "admin") return;
  clearTimeout(typingTimers[ticketId]);
  useSupportStore.setState((s) => ({ typing: { ...s.typing, [ticketId]: isTyping } }));
  if (isTyping) {
    typingTimers[ticketId] = setTimeout(() => {
      useSupportStore.setState((s) => ({ typing: { ...s.typing, [ticketId]: false } }));
    }, TYPING_TTL_MS);
  }
});
