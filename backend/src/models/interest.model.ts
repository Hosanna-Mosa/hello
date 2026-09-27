/**
 * The interest taxonomy.
 *
 * `_id` is the slug, minted once by the seed and never derived at request time.
 * That is the whole point: a profile stores `interestIds`, so an id that moves
 * when someone edits a label takes every profile's interests with it.
 *
 * `aliases` lets an old id keep resolving after a rename or a merge, which is
 * what makes the taxonomy editable at all. `active: false` retires a tag
 * without breaking the profiles that already reference it — deleting the row
 * would leave dangling ids.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const INTEREST_CATEGORIES = [
  "outdoors", "food", "games", "music", "creative", "wellbeing", "learning", "nightlife",
] as const;

const interestSchema = new Schema(
  {
    _id: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    category: { type: String, enum: INTEREST_CATEGORIES, required: true },
    /**
     * Superseded ids that must keep resolving. NO DEFAULT: an empty array
     * indexes as `undefined` on the unique sparse index below and collides
     * with every other empty one. Absent is excluded from a sparse index;
     * empty is not.
     *
     * `default: undefined` is REQUIRED, not decoration: Mongoose gives every
     * array path an automatic `[]` default, so omitting a default is not the
     * same as having none.
     */
    aliases: { type: [String], default: undefined },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false, strict: "throw", strictQuery: true, timestamps: true },
);

interestSchema.index({ category: 1, sortOrder: 1 }, { name: "category_order" });
/** Sparse: most rows have no alias, and an alias must never collide with a live id. */
interestSchema.index({ aliases: 1 }, { unique: true, sparse: true, name: "alias_unique" });

export type InterestDoc = HydratedDocument<InferSchemaType<typeof interestSchema>>;
export const InterestModel = model("Interest", interestSchema);
export { INTEREST_CATEGORIES };
