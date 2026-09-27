/**
 * One person blocking another.
 *
 * ONE ROW, NOT TWO. Blocking is symmetric in effect — neither party sees the
 * other afterwards — but storing it twice would make "who blocked whom" a
 * derived question, and that matters: unblocking must only undo YOUR block,
 * never theirs. So the row records the direction and the queries ask in both.
 *
 * The pair is unique so a double-tap or a retried request cannot create two.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const blockSchema = new Schema(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    blockedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { strict: "throw", strictQuery: true, timestamps: true },
);

blockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true, name: "block_pair_unique" });
/** The reverse lookup — "who has blocked me" — is half of every hidden set. */
blockSchema.index({ blockedUserId: 1 }, { name: "block_reverse" });

export type BlockDoc = HydratedDocument<InferSchemaType<typeof blockSchema>>;
export const BlockModel = model("Block", blockSchema);
