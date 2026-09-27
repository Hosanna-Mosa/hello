/**
 * A profile the user swiped past.
 *
 * NOT in the original contract, and discovery does not work without it: with no
 * record of a pass, the deck hands back the same people on every load, and a
 * declined message request would put its sender straight back in front of the
 * person who declined them — which A18 ("decline is silent") relies on not
 * happening.
 *
 * TTL of 30 days, because a deck that permanently exhausts itself is worse than
 * one that occasionally repeats. Someone passed on in January is a reasonable
 * suggestion again in March.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const passSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: ["deck", "declinedRequest"], default: "deck" },
    createdAt: { type: Date, default: () => new Date() },
  },
  { strict: "throw", strictQuery: true },
);

passSchema.index({ userId: 1, targetId: 1 }, { unique: true, name: "pass_pair_unique" });
/** Expiry IS the semantic here, so a TTL is right — unlike a deleted account. */
passSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2_592_000, name: "pass_ttl" });

export type PassDoc = HydratedDocument<InferSchemaType<typeof passSchema>>;
export const PassModel = model("Pass", passSchema);
