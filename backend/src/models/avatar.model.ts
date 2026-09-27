/**
 * The preset avatar set.
 *
 * A collection rather than a hardcoded enum so that PLAN R2 — "real artwork
 * drops in as data" — is true: new art is a row, not a deploy.
 *
 * There is no image URL here, and there must never be. `_id` is what a profile
 * references; the client maps that id to a bundled asset. The moment this
 * carries a URL, "no photos anywhere" has quietly become false.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const avatarSchema = new Schema(
  {
    _id: { type: String, required: true },
    /**
     * The palette word the id has always carried — "Sunrise", "Meadow".
     *
     * A stable handle for fixtures and logs. Never shown and never read out:
     * `label` is what a person actually needs.
     */
    name: { type: String, trim: true, maxlength: 40 },
    /**
     * What the picture shows — "Side-swept blonde hair with freckles, light
     * skin". This is what the client hands to `accessibilityLabel`, so it is a
     * sentence rather than a word, and 40 characters was not enough for one.
     */
    label: { type: String, required: true, trim: true, maxlength: 80 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false, strict: "throw", strictQuery: true, timestamps: true },
);

avatarSchema.index({ sortOrder: 1 }, { name: "avatar_order" });

export type AvatarDoc = HydratedDocument<InferSchemaType<typeof avatarSchema>>;
export const AvatarModel = model("Avatar", avatarSchema);
