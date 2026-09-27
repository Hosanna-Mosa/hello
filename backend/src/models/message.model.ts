/**
 * A message.
 *
 * `status` IS NOT STORED. It is derived per viewer in the serializer from the
 * other participant's `lastReadAt` / `lastDeliveredAt` cursors on the thread.
 * A stored status would be wrong for one of the two readers anyway — "read" is
 * a fact about who is looking, not about the message.
 *
 * `clientMessageId` makes sending idempotent: a mobile client that retries a
 * request whose response it never saw gets the original message back rather
 * than posting twice. Partial-unique so messages without one still insert.
 *
 * `reactions` is embedded because a two-party thread bounds it at two, and it
 * is always read with the message.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const reactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true, maxlength: 8 },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    threadId: { type: Schema.Types.ObjectId, ref: "Thread", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["text", "system"], default: "text" },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    /** Structured detail for a system message, e.g. a call record. */
    systemMeta: { type: Schema.Types.Mixed, default: null },
    reactions: { type: [reactionSchema], default: [] },
    clientMessageId: { type: String, maxlength: 64, default: undefined },
    createdAt: { type: Date, default: () => new Date() },
  },
  { strict: "throw", strictQuery: true },
);

/** The hottest query in the app: a thread page, newest first. */
messageSchema.index({ threadId: 1, createdAt: -1, _id: -1 }, { name: "thread_messages" });
messageSchema.index(
  { threadId: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: "string" } }, name: "client_message_idempotent" },
);

export type MessageDoc = HydratedDocument<InferSchemaType<typeof messageSchema>>;
export const MessageModel = model("Message", messageSchema);
