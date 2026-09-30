/**
 * Support tickets — every rule lives here.
 *
 * The app's REST routes, the app's socket, the admin REST routes and the admin
 * socket ALL call these functions. A rule enforced in one door and forgotten in
 * another is how a resolved ticket ends up taking replies, so there is one
 * implementation and four thin adapters.
 *
 * THE LIFECYCLE (contract: `SupportTicketStatus`):
 *
 *   open ──requestResolution (admin)──▶ pendingResolution ──accept (user)──▶ resolved
 *     ▲                                        │
 *     └──── decline (user), or the user sends another message ────┘
 *
 * Every edge is a conditional update on the status it leaves, inside a
 * transaction with the system message that records it — so the history and the
 * status can never disagree, and two people acting at once cannot both win.
 *
 * Writing while support is waiting for an answer counts as "not resolved yet".
 * Someone who replies "it's still broken" has answered the question, and
 * leaving the ticket asking them to confirm a fix would be absurd.
 */

import { Types, type ClientSession } from "mongoose";

import { ApiError } from "@/errors/ApiError.js";
import type { AdminDoc } from "@/models/admin.model.js";
import { SupportMessageModel, type SupportMessageDoc } from "@/models/supportMessage.model.js";
import { PREVIEW_MAX, SupportTicketModel, type SupportTicketDoc } from "@/models/supportTicket.model.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import type { SupportUserSummary } from "@/serializers/support.serializer.js";
import type { SupportAuthor, SupportCategory, SupportEvent, SupportTicketStatus } from "@/types/wire.js";
import { withTransaction } from "@/utils/transaction.js";

/** Mongoose rejects `session: undefined` under exactOptionalPropertyTypes. */
const opts = (session: ClientSession | undefined) => (session ? { session } : {});

const DUPLICATE_KEY = 11000;
const isDuplicate = (e: unknown) => (e as { code?: number } | null)?.code === DUPLICATE_KEY;

/** A ticket page is small; these caps only stop a pathological one. */
const USER_TICKETS_MAX = 100;
const MESSAGES_MAX = 1000;

/** Recorded as the system line's body. The apps render their own copy by `event`. */
const EVENT_TEXT: Record<SupportEvent, string> = {
  resolutionRequested: "Support marked this issue as resolved and asked you to confirm.",
  resolutionAccepted: "Issue confirmed as resolved. This ticket is now closed.",
  resolutionDeclined: "Not resolved yet — the ticket is open again.",
};

const RESOLVED = "This ticket is resolved. Open a new ticket if you need more help.";
const CHANGED = "This ticket was just updated. Refresh and try again.";

/** What every write returns: the ticket as it now is, and what was appended. */
export type SupportResult = { ticket: SupportTicketDoc; messages: SupportMessageDoc[] };

type NewMessage = {
  author: SupportAuthor;
  body: string;
  adminId?: Types.ObjectId | null;
  event?: SupportEvent | null;
  clientMessageId?: string | undefined;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** One line, trimmed to fit a list row. */
function previewOf(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_MAX ? `${flat.slice(0, PREVIEW_MAX - 1)}…` : flat;
}

function clean(body: string): string {
  const text = body.trim();
  if (!text) throw ApiError.validation("Message cannot be empty.");
  return text;
}

function objectIdOr404(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound("That ticket doesn't exist.");
  return new Types.ObjectId(id);
}

/**
 * A ticket the user owns. Someone else's is 404, not 403 — confirming that a
 * ticket id exists is itself a leak.
 */
async function ownedTicket(user: UserDoc, ticketId: string, session?: ClientSession): Promise<SupportTicketDoc> {
  const ticket = await SupportTicketModel.findOne({ _id: objectIdOr404(ticketId), userId: user._id }, null, opts(session));
  if (!ticket) throw ApiError.notFound("That ticket doesn't exist.");
  return ticket;
}

async function anyTicket(ticketId: string, session?: ClientSession): Promise<SupportTicketDoc> {
  const ticket = await SupportTicketModel.findById(objectIdOr404(ticketId), null, opts(session));
  if (!ticket) throw ApiError.notFound("That ticket doesn't exist.");
  return ticket;
}

async function insert(ticketId: Types.ObjectId, messages: NewMessage[], session?: ClientSession): Promise<SupportMessageDoc[]> {
  const docs = messages.map((m) => ({
    ticketId,
    author: m.author,
    body: m.body,
    adminId: m.adminId ?? null,
    event: m.event ?? null,
    createdAt: m.createdAt,
    ...(m.clientMessageId ? { clientMessageId: m.clientMessageId } : {}),
  }));
  return (await SupportMessageModel.insertMany(docs, opts(session))) as unknown as SupportMessageDoc[];
}

/** A system line recording a status change, a millisecond after `after`. */
function systemLine(event: SupportEvent, after: Date): NewMessage {
  return { author: "system", body: EVENT_TEXT[event], event, createdAt: new Date(after.getTime() + 1) };
}

/** The denormalised "last message" fields for a ticket update. */
function lastMessageSet(message: NewMessage) {
  return {
    lastMessageAt: message.createdAt,
    lastMessagePreview: previewOf(message.body),
    lastMessageAuthor: message.author,
  };
}

/**
 * The same send, retried: return what the first attempt stored.
 *
 * Checked before inserting AND recovered from the unique index after, because
 * two retries can race past the check together.
 */
async function priorSend(ticketId: Types.ObjectId, clientMessageId: string | undefined, session?: ClientSession) {
  if (!clientMessageId) return null;
  return SupportMessageModel.findOne({ ticketId, clientMessageId }, null, opts(session));
}

// ---------------------------------------------------------------------------
// The user's side
// ---------------------------------------------------------------------------

export type NewTicket = { subject: string; category: SupportCategory; message: string; clientMessageId?: string | undefined };

/** Open a ticket with its first message, atomically. */
export async function createTicket(user: UserDoc, input: NewTicket): Promise<SupportResult> {
  const body = clean(input.message);

  // A retried create must not open a second ticket. The idempotency index is
  // per ticket, so look for the first message across this user's tickets.
  if (input.clientMessageId) {
    const first = await SupportMessageModel.findOne({ clientMessageId: input.clientMessageId, author: "user" });
    if (first) {
      const existing = await SupportTicketModel.findOne({ _id: first.ticketId, userId: user._id });
      if (existing) return { ticket: existing, messages: [first] };
    }
  }

  return withTransaction(async (session) => {
    const now = new Date();
    const opening: NewMessage = { author: "user", body, clientMessageId: input.clientMessageId, createdAt: now };

    const [ticket] = await SupportTicketModel.create(
      [
        {
          userId: user._id,
          subject: input.subject.trim(),
          category: input.category,
          status: "open",
          unreadForAdmin: 1,
          ...lastMessageSet(opening),
        },
      ],
      opts(session),
    );
    if (!ticket) throw ApiError.server("Could not open the ticket.");

    const messages = await insert(ticket._id, [opening], session);
    return { ticket, messages };
  });
}

export async function listUserTickets(user: UserDoc): Promise<SupportTicketDoc[]> {
  return SupportTicketModel.find({ userId: user._id }).sort({ lastMessageAt: -1, _id: -1 }).limit(USER_TICKETS_MAX);
}

/** The ticket and its conversation — and it is now read. */
export async function openUserTicket(user: UserDoc, ticketId: string): Promise<SupportResult> {
  const ticket = await ownedTicket(user, ticketId);
  const [messages, read] = await Promise.all([listMessages(ticket._id), markReadByUser(user, ticketId)]);
  return { ticket: read, messages };
}

export async function markReadByUser(user: UserDoc, ticketId: string): Promise<SupportTicketDoc> {
  const ticket = await SupportTicketModel.findOneAndUpdate(
    { _id: objectIdOr404(ticketId), userId: user._id },
    { $set: { unreadForUser: 0 } },
    { new: true },
  );
  if (!ticket) throw ApiError.notFound("That ticket doesn't exist.");
  return ticket;
}

/**
 * The user writes. If support was waiting for them to confirm a fix, this is
 * their answer: "not yet" — the ticket reopens, and the history says so.
 */
export async function sendUserMessage(
  user: UserDoc,
  ticketId: string,
  rawBody: string,
  clientMessageId?: string,
): Promise<SupportResult> {
  const body = clean(rawBody);

  try {
    return await withTransaction(async (session) => {
      const ticket = await ownedTicket(user, ticketId, session);

      const prior = await priorSend(ticket._id, clientMessageId, session);
      if (prior) return { ticket, messages: [prior] };

      if (ticket.status === "resolved") throw ApiError.validation(RESOLVED);

      const now = new Date();
      const said: NewMessage = { author: "user", body, clientMessageId, createdAt: now };
      const reopening = ticket.status === "pendingResolution";
      const lines = reopening ? [said, systemLine("resolutionDeclined", now)] : [said];

      const updated = await SupportTicketModel.findOneAndUpdate(
        // Conditional on the status just read: a concurrent change fails
        // loudly instead of being silently overwritten.
        { _id: ticket._id, status: ticket.status },
        {
          $set: {
            ...lastMessageSet(said),
            ...(reopening ? { status: "open", resolutionRequestedAt: null, resolutionRequestedBy: null } : {}),
          },
          $inc: { unreadForAdmin: 1 },
        },
        { new: true, ...opts(session) },
      );
      if (!updated) throw ApiError.validation(CHANGED);

      return { ticket: updated, messages: await insert(ticket._id, lines, session) };
    });
  } catch (e) {
    if (!isDuplicate(e) || !clientMessageId) throw e;
    const ticket = await ownedTicket(user, ticketId);
    const prior = await priorSend(ticket._id, clientMessageId);
    if (!prior) throw e;
    return { ticket, messages: [prior] };
  }
}

/**
 * The user answers "is this resolved?".
 *
 * Yes closes the ticket for good. No sends it back to `open`. Answering the
 * same way twice (a double tap, a retry) is a no-op, not an error.
 */
export async function respondToResolution(user: UserDoc, ticketId: string, accept: boolean): Promise<SupportResult> {
  const ticket = await ownedTicket(user, ticketId);

  const alreadyThere: SupportTicketStatus = accept ? "resolved" : "open";
  if (ticket.status === alreadyThere) return { ticket, messages: [] };
  if (ticket.status !== "pendingResolution") {
    throw ApiError.validation("Support hasn't asked to resolve this ticket.");
  }

  return withTransaction(async (session) => {
    const now = new Date();
    const line = systemLine(accept ? "resolutionAccepted" : "resolutionDeclined", now);

    const updated = await SupportTicketModel.findOneAndUpdate(
      { _id: ticket._id, userId: user._id, status: "pendingResolution" },
      {
        $set: {
          ...lastMessageSet(line),
          ...(accept
            ? { status: "resolved", resolvedAt: now }
            : { status: "open", resolutionRequestedAt: null, resolutionRequestedBy: null }),
        },
        $inc: { unreadForAdmin: 1 },
      },
      { new: true, ...opts(session) },
    );
    if (!updated) throw ApiError.validation(CHANGED);

    return { ticket: updated, messages: await insert(ticket._id, [line], session) };
  });
}

// ---------------------------------------------------------------------------
// The support team's side
// ---------------------------------------------------------------------------

export async function listMessages(ticketId: Types.ObjectId | string): Promise<SupportMessageDoc[]> {
  const id = typeof ticketId === "string" ? objectIdOr404(ticketId) : ticketId;
  return SupportMessageModel.find({ ticketId: id }).sort({ createdAt: 1, _id: 1 }).limit(MESSAGES_MAX);
}

/** Support replies. Allowed while waiting for confirmation; never once resolved. */
export async function sendAdminMessage(
  admin: AdminDoc,
  ticketId: string,
  rawBody: string,
  clientMessageId?: string,
): Promise<SupportResult> {
  const body = clean(rawBody);

  try {
    return await withTransaction(async (session) => {
      const ticket = await anyTicket(ticketId, session);

      const prior = await priorSend(ticket._id, clientMessageId, session);
      if (prior) return { ticket, messages: [prior] };

      if (ticket.status === "resolved") throw ApiError.validation("This ticket is resolved and can't take new replies.");

      const said: NewMessage = { author: "admin", body, adminId: admin._id, clientMessageId, createdAt: new Date() };
      const updated = await SupportTicketModel.findOneAndUpdate(
        { _id: ticket._id, status: { $ne: "resolved" } },
        // Replying is reading: the team has seen everything up to its own answer.
        { $set: { ...lastMessageSet(said), unreadForAdmin: 0 }, $inc: { unreadForUser: 1 } },
        { new: true, ...opts(session) },
      );
      if (!updated) throw ApiError.validation(CHANGED);

      return { ticket: updated, messages: await insert(ticket._id, [said], session) };
    });
  } catch (e) {
    if (!isDuplicate(e) || !clientMessageId) throw e;
    const ticket = await anyTicket(ticketId);
    const prior = await priorSend(ticket._id, clientMessageId);
    if (!prior) throw e;
    return { ticket, messages: [prior] };
  }
}

/**
 * Support believes it is fixed and ASKS the user to confirm. The ticket does
 * not close here — only the user can do that.
 */
export async function requestResolution(admin: AdminDoc, ticketId: string): Promise<SupportResult> {
  const ticket = await anyTicket(ticketId);

  if (ticket.status === "pendingResolution") return { ticket, messages: [] };
  if (ticket.status === "resolved") throw ApiError.validation("This ticket is already resolved.");

  return withTransaction(async (session) => {
    const now = new Date();
    const line = systemLine("resolutionRequested", now);

    const updated = await SupportTicketModel.findOneAndUpdate(
      { _id: ticket._id, status: "open" },
      {
        $set: {
          ...lastMessageSet(line),
          status: "pendingResolution",
          resolutionRequestedAt: now,
          resolutionRequestedBy: admin._id,
          unreadForAdmin: 0,
        },
        $inc: { unreadForUser: 1 },
      },
      { new: true, ...opts(session) },
    );
    if (!updated) throw ApiError.validation(CHANGED);

    return { ticket: updated, messages: await insert(ticket._id, [line], session) };
  });
}

export async function markReadByAdmin(ticketId: string): Promise<SupportTicketDoc> {
  const ticket = await SupportTicketModel.findOneAndUpdate(
    { _id: objectIdOr404(ticketId) },
    { $set: { unreadForAdmin: 0 } },
    { new: true },
  );
  if (!ticket) throw ApiError.notFound("That ticket doesn't exist.");
  return ticket;
}

// ---------------------------------------------------------------------------
// Admin reads
// ---------------------------------------------------------------------------

/** Escaped: an unescaped user string in a regex is a denial-of-service. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toSummary(u: Pick<UserDoc, "_id" | "name" | "avatarId" | "status">): SupportUserSummary {
  return { id: String(u._id), name: u.name || "Unnamed", avatarId: u.avatarId, status: u.status };
}

async function summariesFor(userIds: Types.ObjectId[]): Promise<Map<string, SupportUserSummary>> {
  const users = await UserModel.find({ _id: { $in: userIds } }).select("name avatarId status");
  return new Map(users.map((u) => [String(u._id), toSummary(u)]));
}

export async function ownerSummary(ticket: SupportTicketDoc): Promise<SupportUserSummary | null> {
  return (await summariesFor([ticket.userId])).get(String(ticket.userId)) ?? null;
}

export function summaryOfUser(user: UserDoc): SupportUserSummary {
  return toSummary(user);
}

export type AdminTicketQuery = { page: number; limit: number; status?: SupportTicketStatus | undefined; search?: string | undefined };

export async function listTicketsForAdmin(q: AdminTicketQuery) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;

  if (q.search) {
    const term = escapeRegex(q.search.toLowerCase());
    const people = await UserModel.find({ nameLower: { $regex: term } }).select("_id").limit(200);
    filter.$or = [{ subject: { $regex: term, $options: "i" } }, { userId: { $in: people.map((p) => p._id) } }];
  }

  const [items, total] = await Promise.all([
    SupportTicketModel.find(filter)
      .sort({ lastMessageAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    SupportTicketModel.countDocuments(filter),
  ]);

  const owners = await summariesFor(items.map((t) => t.userId));
  return { items, total, owners };
}

/** The ticket, who raised it and the whole conversation — and the team has now read it. */
export async function openTicketForAdmin(ticketId: string) {
  const ticket = await markReadByAdmin(ticketId);
  const [messages, owner] = await Promise.all([listMessages(ticket._id), ownerSummary(ticket)]);
  return { ticket, messages, owner };
}

/** The counts the panel's sidebar and dashboard show. */
export async function supportSummary() {
  const [open, pendingResolution, resolved, unread] = await Promise.all([
    SupportTicketModel.countDocuments({ status: "open" }),
    SupportTicketModel.countDocuments({ status: "pendingResolution" }),
    SupportTicketModel.countDocuments({ status: "resolved" }),
    SupportTicketModel.countDocuments({ unreadForAdmin: { $gt: 0 }, status: { $ne: "resolved" } }),
  ]);
  return { open, pendingResolution, resolved, unread };
}

/** For socket room checks: does this user own this ticket? */
export async function userOwnsTicket(user: UserDoc, ticketId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(ticketId)) return false;
  return (await SupportTicketModel.exists({ _id: ticketId, userId: user._id })) !== null;
}

export async function ticketExists(ticketId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(ticketId)) return false;
  return (await SupportTicketModel.exists({ _id: ticketId })) !== null;
}
