/**
 * A signed-in device.
 *
 * Redis decides whether a refresh token is *valid*; this collection is the
 * durable record of what happened. The split matters: a Redis flush (eviction,
 * restart, a mistaken FLUSHDB) would sign everyone out, which is survivable —
 * but it must not also erase the evidence of a token-reuse incident, which is
 * exactly what an investigation needs.
 *
 * `revokedReason` distinguishes an ordinary sign-out from `reuse`, which means
 * a refresh token was presented twice and the whole family was destroyed.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Stable id for the device's token family; rotation keeps it. */
    sessionId: { type: String, required: true },
    deviceId: { type: String, default: null },
    userAgent: { type: String, maxlength: 300, default: null },
    /** Hashed, never the raw address — it is personal data with no lookup need. */
    ipHash: { type: String, default: null },

    createdAt: { type: Date, default: () => new Date() },
    lastSeenAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },

    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: ["signout", "reuse", "rotate", "adminRevoke", "accountDeleted"],
      default: null,
    },
  },
  { strict: "throw", strictQuery: true, minimize: false },
);

/**
 * One row per device per sign-in. `sessionId` is unique within a user, not
 * globally, because it is a UUID minted per family.
 */
sessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true, name: "user_session_unique" });
sessionSchema.index({ userId: 1, lastSeenAt: -1 }, { name: "user_recent_sessions" });

/**
 * TTL at the stored instant (`expireAfterSeconds: 0`), matching the 30-day
 * refresh lifetime. Correct here because expiry IS the whole semantic of a
 * session row — unlike a soft-deleted account, where a TTL would skip the
 * erasure cascade.
 */
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "session_ttl" });

export type SessionDoc = HydratedDocument<InferSchemaType<typeof sessionSchema>>;
export const SessionModel = model("Session", sessionSchema);
