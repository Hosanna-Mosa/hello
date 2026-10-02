/**
 * The archived copy of an account at the moment it was deleted.
 *
 * Deletion is instant: the live `users` row is scrubbed and its phone and email
 * are released, so signing up again with the same credentials creates a NEW
 * account with a new id. This collection is the only place the old data still
 * exists — for moderation (a reported person who deletes and rejoins), for
 * support, and for legal holds.
 *
 * It is never read by the app and never joined into a live query. Nothing here
 * can sign anyone in: the password hash is deliberately NOT copied.
 *
 * `phoneHmac` / `emailHmac` are the same peppered HMACs the live index uses,
 * so an operator can find "has this number been here before" without the
 * archive being a plaintext lookup table.
 */

import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const deletedAccountSchema = new Schema(
  {
    /** The `_id` the account had. The live row keeps it as an anonymous tombstone. */
    originalUserId: { type: Schema.Types.ObjectId, required: true },
    phoneHmac: { type: String, default: null },
    emailHmac: { type: String, default: null },

    deletedAt: { type: Date, required: true, default: () => new Date() },
    reason: { type: String, maxlength: 200, default: null },
    /** Who pressed the button. Only the owner can today; an admin path may follow. */
    deletedBy: { type: String, enum: ["user", "admin"], default: "user" },

    /** The user document as it was, minus `passwordHash`. Free-form on purpose: it is a record, not a model. */
    snapshot: { type: Schema.Types.Mixed, required: true },

    /** The relationships torn down with it, so a moderator can see what the account was connected to. */
    related: {
      matchIds: { type: [Schema.Types.ObjectId], default: [] },
      threadIds: { type: [Schema.Types.ObjectId], default: [] },
      likesSent: { type: Number, default: 0 },
      likesReceived: { type: Number, default: 0 },
      blocksMade: { type: [Schema.Types.ObjectId], default: [] },
      reportsFiled: { type: Number, default: 0 },
      reportsAgainst: { type: Number, default: 0 },
    },
  },
  { timestamps: false, strict: "throw", minimize: false },
);

/** "Has this number / email been deleted before?" — the moderation lookups. Not unique: a person can leave twice. */
deletedAccountSchema.index({ phoneHmac: 1 }, { name: "deleted_phone_hmac" });
deletedAccountSchema.index({ emailHmac: 1 }, { name: "deleted_email_hmac", sparse: true });
deletedAccountSchema.index({ originalUserId: 1 }, { name: "deleted_original_user" });

export type DeletedAccountDoc = HydratedDocument<InferSchemaType<typeof deletedAccountSchema>>;

export const DeletedAccountModel = model("DeletedAccount", deletedAccountSchema);
