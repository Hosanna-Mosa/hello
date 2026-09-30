/**
 * Support tickets.
 *
 * REAL MODE speaks to `/v1/support/*`, and sends messages over the live socket
 * first — that is what makes the conversation feel like chat — falling back to
 * HTTP when there is no connection or no answer. Both carry the same
 * `clientMessageId`, so a send that landed on the socket and is retried over
 * HTTP is stored once.
 *
 * MOCK MODE keeps everything in memory, with a scripted support agent who
 * answers a moment after you write (`mockSupportReplySync`) and a dev-only way
 * to have support ask to resolve (`mockRequestResolutionSync`) — so the whole
 * flow, popup included, can be demoed and tested with no server.
 */

import { ApiError, http, isMockMode, nextId, nowIso, request } from "./client";
import { sendSupportMessageLive } from "./socket";
import type {
  ApiErrorCode,
  SupportAuthor,
  SupportCategory,
  SupportEvent,
  SupportMessage,
  SupportTicket,
  SupportTicketDetail,
} from "./types";

/** The order categories are offered in. Labels live in `copy.support.category`. */
export const SUPPORT_CATEGORIES: SupportCategory[] = [
  "account",
  "technical",
  "safety",
  "billing",
  "feedback",
  "other",
];

export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 120;
export const MESSAGE_MAX = 2000;

export type NewTicketInput = { subject: string; category: SupportCategory; message: string };

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

let tickets: SupportTicket[] = [];
let messages: Record<string, SupportMessage[]> = {};

/** The scripted agent's lines, in order, per ticket. */
const AGENT_SCRIPT = [
  "Thanks for getting in touch — I'm looking into this now.",
  "Thanks, that helps. I've made a change on our side. Could you try again and let me know?",
  "Got it. I'll keep an eye on this ticket — reply here any time.",
];
const agentTurn: Record<string, number> = {};

const EVENT_TEXT: Record<SupportEvent, string> = {
  resolutionRequested: "Support marked this issue as resolved and asked you to confirm.",
  resolutionAccepted: "Issue confirmed as resolved. This ticket is now closed.",
  resolutionDeclined: "Not resolved yet — the ticket is open again.",
};

function mockMessage(ticketId: string, author: SupportAuthor, body: string, event: SupportEvent | null = null): SupportMessage {
  return { id: nextId("smsg"), ticketId, author, body, event, clientMessageId: null, createdAt: nowIso() };
}

function requireMockTicket(id: string): SupportTicket {
  const found = tickets.find((t) => t.id === id);
  if (!found) throw new ApiError("notFound", "That ticket doesn't exist.");
  return found;
}

/** Append lines and update the ticket — returning new objects, never mutating. */
function mockAppend(id: string, lines: SupportMessage[], patch: Partial<SupportTicket>): SupportTicketDetail {
  const last = lines[lines.length - 1];
  const current = requireMockTicket(id);
  const next: SupportTicket = {
    ...current,
    ...patch,
    ...(last
      ? {
          lastMessageAt: last.createdAt,
          lastMessagePreview: last.body.replace(/\s+/g, " ").slice(0, 140),
          lastMessageAuthor: last.author,
        }
      : {}),
  };
  tickets = tickets.map((t) => (t.id === id ? next : t));
  messages = { ...messages, [id]: [...(messages[id] ?? []), ...lines] };
  return { ticket: { ...next }, messages: lines };
}

function sortedMockTickets(): SupportTicket[] {
  return [...tickets]
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .map((t) => ({ ...t }));
}

/** A refusal from the socket, as the same error the HTTP path would throw. */
function asApiError(e: unknown): ApiError {
  const code = ((e as { code?: string }).code ?? "server") as ApiErrorCode;
  return new ApiError(code, (e as Error).message);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const supportService = {
  async listTickets(): Promise<SupportTicket[]> {
    if (!isMockMode()) return http<SupportTicket[]>("GET", "/support/tickets");
    return request(() => sortedMockTickets());
  },

  async createTicket(input: NewTicketInput, clientMessageId = nextId("support")): Promise<SupportTicketDetail> {
    if (!isMockMode()) {
      return http<SupportTicketDetail>("POST", "/support/tickets", { ...input, clientMessageId });
    }

    return request(() => {
      const createdAt = nowIso();
      const ticket: SupportTicket = {
        id: nextId("ticket"),
        subject: input.subject.trim(),
        category: input.category,
        status: "open",
        lastMessageAt: createdAt,
        lastMessagePreview: "",
        lastMessageAuthor: "user",
        unreadCount: 0,
        resolutionRequestedAt: null,
        resolvedAt: null,
        createdAt,
      };
      tickets = [...tickets, ticket];
      return mockAppend(ticket.id, [mockMessage(ticket.id, "user", input.message.trim())], {});
    });
  },

  /** The ticket and its whole conversation. Opening it marks it read. */
  async getTicket(id: string): Promise<SupportTicketDetail> {
    if (!isMockMode()) return http<SupportTicketDetail>("GET", `/support/tickets/${encodeURIComponent(id)}`);

    return request(() => {
      requireMockTicket(id);
      tickets = tickets.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t));
      return { ticket: { ...requireMockTicket(id) }, messages: [...(messages[id] ?? [])] };
    });
  },

  async sendMessage(id: string, body: string, clientMessageId: string): Promise<SupportTicketDetail> {
    if (!isMockMode()) {
      const live = await sendSupportMessageLive(id, body, clientMessageId).catch((e: unknown) => {
        throw asApiError(e);
      });
      if (live) return live;
      return http<SupportTicketDetail>("POST", `/support/tickets/${encodeURIComponent(id)}/messages`, {
        body,
        clientMessageId,
      });
    }

    return request(() => {
      const ticket = requireMockTicket(id);
      if (ticket.status === "resolved") {
        throw new ApiError("validation", "This ticket is resolved. Open a new ticket if you need more help.");
      }
      const said = { ...mockMessage(id, "user", body.trim()), clientMessageId };
      // Same rule as the server: writing while support waits for an answer is "not yet".
      if (ticket.status === "pendingResolution") {
        return mockAppend(id, [said, mockMessage(id, "system", EVENT_TEXT.resolutionDeclined, "resolutionDeclined")], {
          status: "open",
          resolutionRequestedAt: null,
        });
      }
      return mockAppend(id, [said], {});
    });
  },

  async markRead(id: string): Promise<SupportTicket> {
    if (!isMockMode()) return http<SupportTicket>("POST", `/support/tickets/${encodeURIComponent(id)}/read`);

    return request(() => {
      requireMockTicket(id);
      tickets = tickets.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t));
      return { ...requireMockTicket(id) };
    });
  },

  /** The answer to "is this resolved?" — yes closes the ticket, no reopens it. */
  async respondToResolution(id: string, accept: boolean): Promise<SupportTicketDetail> {
    if (!isMockMode()) {
      return http<SupportTicketDetail>("POST", `/support/tickets/${encodeURIComponent(id)}/resolution`, { accept });
    }

    return request(() => {
      const ticket = requireMockTicket(id);
      if (ticket.status === (accept ? "resolved" : "open")) return { ticket: { ...ticket }, messages: [] };
      if (ticket.status !== "pendingResolution") {
        throw new ApiError("validation", "Support hasn't asked to resolve this ticket.");
      }
      const event: SupportEvent = accept ? "resolutionAccepted" : "resolutionDeclined";
      return mockAppend(
        id,
        [mockMessage(id, "system", EVENT_TEXT[event], event)],
        accept ? { status: "resolved", resolvedAt: nowIso() } : { status: "open", resolutionRequestedAt: null },
      );
    });
  },

  // --- mock-only theatre ----------------------------------------------------

  /** The scripted agent's next reply, or null once the ticket is closed. MOCK ONLY. */
  mockSupportReplySync(id: string): SupportTicketDetail | null {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticket.status === "resolved") return null;
    const turn = agentTurn[id] ?? 0;
    agentTurn[id] = turn + 1;
    const body = AGENT_SCRIPT[Math.min(turn, AGENT_SCRIPT.length - 1)] ?? AGENT_SCRIPT[0] ?? "";
    return mockAppend(id, [mockMessage(id, "admin", body)], { unreadCount: ticket.unreadCount + 1 });
  },

  /** Support asks to resolve — what the panel's Resolve button does. MOCK / DEV ONLY. */
  mockRequestResolutionSync(id: string): SupportTicketDetail | null {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticket.status !== "open") return null;
    return mockAppend(
      id,
      [mockMessage(id, "system", EVENT_TEXT.resolutionRequested, "resolutionRequested")],
      { status: "pendingResolution", resolutionRequestedAt: nowIso(), unreadCount: ticket.unreadCount + 1 },
    );
  },

  __reset(): void {
    tickets = [];
    messages = {};
    for (const key of Object.keys(agentTurn)) delete agentTurn[key];
  },
};
