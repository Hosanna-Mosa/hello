/**
 * An admin panel operator.
 *
 * A SEPARATE collection from `users`, on purpose. `users.role` exists, but an
 * app account signs in with a phone code — and a panel that trusted that would
 * hand moderation to anyone who can receive an SMS on the right number. Admins
 * have their own credentials, their own secret and their own sessions.
 *
 * `passwordHash` is scrypt (see `utils/password.ts`), never the password. The
 * lockout fields make a guesser's budget per ACCOUNT as well as per IP: the IP
 * limit alone is walked around by rotating addresses.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const adminSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    name: { type: String, trim: true, maxlength: 80, default: "Admin" },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },

    failedAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { strict: "throw", strictQuery: true, timestamps: true },
);

adminSchema.index({ email: 1 }, { unique: true, name: "admin_email_unique" });

export type AdminDoc = HydratedDocument<InferSchemaType<typeof adminSchema>>;
export const AdminModel = model("Admin", adminSchema);
