/**
 * A support ticket: one problem, raised by one user, worked through with the
 * support team in its own conversation.
 *
 * STATUS MOVES ALONG FIXED EDGES (see `SupportTicketStatus` in the contract):
 * support can only ask to resolve (`open` → `pendingResolution`), and only the
 * user can close (`pendingResolution` → `resolved`) or reopen it. Every edge is
 * a conditional `findOneAndUpdate` in `support.service.ts`, so two people
 * acting at once cannot both win.
 *
 * The last message is DENORMALISED here for the same reason `Thread` does it:
 * both ticket lists render a preview per row, and fetching one per row is N+1.
 *
 * Unread is a counter per side rather than a read cursor: a ticket has exactly
 * two readers (the user, and "support" as a team), and a counter is what both
 * lists display.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const SUPPORT_CATEGORIES = ["account", "safety", "technical", "billing", "feedback", "other"] as const;
export const SUPPORT_STATUSES = ["open", "pendingResolution", "resolved"] as const;
export const SUPPORT_AUTHORS = ["user", "admin", "system"] as const;

export const SUBJECT_MAX = 120;
export const PREVIEW_MAX = 140;

const supportTicketSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true, minlength: 3, maxlength: SUBJECT_MAX },
    category: { type: String, enum: SUPPORT_CATEGORIES, required: true },
    status: { type: String, enum: SUPPORT_STATUSES, default: "open" },

    lastMessageAt: { type: Date, default: () => new Date() },
    lastMessagePreview: { type: String, default: "", maxlength: PREVIEW_MAX },
    lastMessageAuthor: { type: String, enum: SUPPORT_AUTHORS, default: "user" },

    unreadForUser: { type: Number, default: 0, min: 0 },
    unreadForAdmin: { type: Number, default: 0, min: 0 },

    /** Who pressed "resolve", and when. Cleared if the user says "not yet". */
    resolutionRequestedAt: { type: Date, default: null },
    resolutionRequestedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { strict: "throw", strictQuery: true, timestamps: true },
);

/** The user's own list: "my tickets, most recent activity first". */
supportTicketSchema.index({ userId: 1, lastMessageAt: -1 }, { name: "support_by_user" });
/** The admin queue, filtered by status. */
supportTicketSchema.index({ status: 1, lastMessageAt: -1 }, { name: "support_by_status" });
/** The admin queue, unfiltered. */
supportTicketSchema.index({ lastMessageAt: -1 }, { name: "support_recent" });

export type SupportTicketDoc = HydratedDocument<InferSchemaType<typeof supportTicketSchema>>;
export const SupportTicketModel = model("SupportTicket", supportTicketSchema);
