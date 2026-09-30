/**
 * One line in a support conversation.
 *
 * `author` is a ROLE, not a person: the user sees "Support", never which
 * operator answered. `adminId` records who did, for the panel and for audit,
 * and is never sent to the app.
 *
 * `system` lines record a status change (`event`) — they are what makes the
 * history readable afterwards: "support asked to resolve", "the user said not
 * yet", "resolved".
 *
 * `clientMessageId` makes sending idempotent, exactly as in chat: a phone that
 * retries a send whose response it never saw gets the original back.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

import { SUPPORT_AUTHORS } from "@/models/supportTicket.model.js";

export const SUPPORT_EVENTS = ["resolutionRequested", "resolutionAccepted", "resolutionDeclined"] as const;
export const SUPPORT_MESSAGE_MAX = 2000;

const supportMessageSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true },
    author: { type: String, enum: SUPPORT_AUTHORS, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    body: { type: String, required: true, trim: true, maxlength: SUPPORT_MESSAGE_MAX },
    event: { type: String, enum: [...SUPPORT_EVENTS, null], default: null },
    clientMessageId: { type: String, maxlength: 64, default: undefined },
    createdAt: { type: Date, default: () => new Date() },
  },
  { strict: "throw", strictQuery: true },
);

/** A ticket's conversation, oldest first. */
supportMessageSchema.index({ ticketId: 1, createdAt: 1, _id: 1 }, { name: "support_messages" });
supportMessageSchema.index(
  { ticketId: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: "string" } },
    name: "support_client_message_idempotent",
  },
);

export type SupportMessageDoc = HydratedDocument<InferSchemaType<typeof supportMessageSchema>>;
export const SupportMessageModel = model("SupportMessage", supportMessageSchema);
