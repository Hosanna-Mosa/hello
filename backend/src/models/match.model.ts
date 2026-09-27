/**
 * A mutual connection.
 *
 * `pairKey` is the sorted pair of ids with a UNIQUE index, and it is what makes
 * two product rules STRUCTURAL rather than a code path someone has to remember:
 *
 * 1. "Unmatching keeps the Match row with `endedAt` set, so the pair cannot
 *    resurface" — the row stays, so a second insert for that pair fails on the
 *    index. The pair genuinely cannot recur.
 * 2. Two people liking each other at the same instant race to create a match.
 *    The unique index decides it; the loser catches E11000 and reads the
 *    winner's row. No distributed lock, and correct under concurrency, which a
 *    check-then-insert is not.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument, type Types } from "mongoose";

const matchSchema = new Schema(
  {
    /** Sorted, so a pair has exactly one representation. */
    userIds: {
      type: [Schema.Types.ObjectId],
      required: true,
      validate: { validator: (v: unknown[]) => v.length === 2, message: "a match has exactly two members" },
    },
    pairKey: { type: String, required: true },
    threadId: { type: Schema.Types.ObjectId, ref: "Thread", default: null },
    source: { type: String, enum: ["mutualLike", "acceptedRequest"], required: true },
    createdAt: { type: Date, default: () => new Date() },
    /** Set on unmatch. The row is KEPT so the pair cannot recur. */
    endedAt: { type: Date, default: null },
    endedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { strict: "throw", strictQuery: true },
);

matchSchema.index({ pairKey: 1 }, { unique: true, name: "match_pair_unique" });
matchSchema.index({ userIds: 1, endedAt: 1, createdAt: -1 }, { name: "user_matches" });

/** Order-independent, so (a,b) and (b,a) are the same pair. */
export function pairKeyFor(a: Types.ObjectId | string, b: Types.ObjectId | string): string {
  return [String(a), String(b)].sort().join("_");
}

export type MatchDoc = HydratedDocument<InferSchemaType<typeof matchSchema>>;
export const MatchModel = model("Match", matchSchema);
