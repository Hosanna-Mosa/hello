/**
 * Support tickets on the wire — two views of the same records.
 *
 * The APP view is the contract type (`SupportTicket` / `SupportMessage`):
 * unread means "from support", and nothing says which operator replied.
 *
 * The ADMIN view adds who raised the ticket and which admin wrote each reply,
 * and its unread count is the team's, not the user's.
 */

import type { SupportMessageDoc } from "@/models/supportMessage.model.js";
import type { SupportTicketDoc } from "@/models/supportTicket.model.js";
import type {
  SupportAuthor,
  SupportCategory,
  SupportEvent,
  SupportMessage,
  SupportTicket,
  SupportTicketStatus,
} from "@/types/wire.js";

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const isoOrNow = (d: Date | null | undefined): string => (d ?? new Date()).toISOString();

export function toSupportTicket(t: SupportTicketDoc): SupportTicket {
  return {
    id: String(t._id),
    subject: t.subject,
    category: t.category as SupportCategory,
    status: t.status as SupportTicketStatus,
    lastMessageAt: isoOrNow(t.lastMessageAt),
    lastMessagePreview: t.lastMessagePreview,
    lastMessageAuthor: t.lastMessageAuthor as SupportAuthor,
    unreadCount: t.unreadForUser,
    resolutionRequestedAt: iso(t.resolutionRequestedAt),
    resolvedAt: iso(t.resolvedAt),
    createdAt: isoOrNow(t.get("createdAt") as Date | undefined),
  };
}

export function toSupportMessage(m: SupportMessageDoc): SupportMessage {
  return {
    id: String(m._id),
    ticketId: String(m.ticketId),
    author: m.author as SupportAuthor,
    body: m.body,
    event: (m.event ?? null) as SupportEvent | null,
    clientMessageId: m.clientMessageId ?? null,
    createdAt: isoOrNow(m.createdAt),
  };
}

/** Who raised a ticket, as the panel lists them. Null once the account is erased. */
export type SupportUserSummary = { id: string; name: string; avatarId: string; status: string };

export function toAdminSupportTicket(t: SupportTicketDoc, user: SupportUserSummary | null) {
  return {
    ...toSupportTicket(t),
    // The TEAM's unread count — replies from the user nobody has opened yet.
    unreadCount: t.unreadForAdmin,
    user: user ?? { id: String(t.userId), name: "Deleted account", avatarId: "", status: "erased" },
  };
}

export function toAdminSupportMessage(m: SupportMessageDoc) {
  return { ...toSupportMessage(m), adminId: m.adminId ? String(m.adminId) : null };
}

export type AdminSupportTicket = ReturnType<typeof toAdminSupportTicket>;
export type AdminSupportMessage = ReturnType<typeof toAdminSupportMessage>;
