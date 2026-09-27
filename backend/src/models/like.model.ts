/**
 * A like. With a note it becomes a message request; without one it is silent.
 *
 * Unique on `(fromUserId, toUserId)`, which makes re-liking idempotent rather
 * than an error — a double tap on a flaky connection must not cost a second
 * like from the daily quota.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const likeSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Present only for a like-with-a-note. Becomes the request's message. */
    note: { type: String, trim: true, maxlength: 300, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { strict: "throw", strictQuery: true },
);

likeSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true, name: "like_pair_unique" });
/** `GET /likes/inbound`, newest first, keyset-ready. */
likeSchema.index({ toUserId: 1, createdAt: -1, _id: -1 }, { name: "inbound_likes" });

export type LikeDoc = HydratedDocument<InferSchemaType<typeof likeSchema>>;
export const LikeModel = model("Like", likeSchema);
