/**
 * A like-with-a-note, awaiting an answer.
 *
 * Its own collection rather than a field on `likes` because it has its own
 * state machine and its own hot query (`toUserId` + `status`), and because a
 * declined request must be queryable without touching the like that spawned it.
 *
 * A18: requests do not expire, so `resolvedAt` stays null until acted on.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const requestSchema = new Schema(
  {
    likeId: { type: Schema.Types.ObjectId, ref: "Like", required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    createdAt: { type: Date, default: () => new Date() },
    resolvedAt: { type: Date, default: null },
  },
  { strict: "throw", strictQuery: true },
);

requestSchema.index({ toUserId: 1, status: 1, createdAt: -1, _id: -1 }, { name: "inbox_by_status" });
/** One request per like — a like cannot spawn two. */
requestSchema.index({ likeId: 1 }, { unique: true, name: "request_like_unique" });

export type MessageRequestDoc = HydratedDocument<InferSchemaType<typeof requestSchema>>;
export const MessageRequestModel = model("MessageRequest", requestSchema);
