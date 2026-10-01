/**
 * The user document.
 *
 * Three things here are load-bearing rather than decorative:
 *
 * 1. `strict: "throw"` — writing a field the schema does not declare THROWS
 *    rather than silently dropping it. Combined with the no-photo test in
 *    `tests/`, "there are no photo fields anywhere" stops being a promise and
 *    becomes something the process enforces.
 *
 * 2. `publicGenderKind` is DERIVED in a hook, never set by a caller. It is the
 *    only gender field a public query or serializer is allowed to read. The
 *    alternative — remembering to check `showGender` at every call site — is a
 *    privacy leak waiting for the one query that forgets.
 *
 * 3. `birthday` is stored; age is not. An age column is wrong the day after it
 *    is written. Age filters become birthday range queries, which index fine.
 *
 * Coordinates are GeoJSON `[longitude, latitude]` — that order is the single
 * most common bug in geo code, so the validator asserts the ranges rather than
 * trusting the caller.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const GENDER_KINDS = ["woman", "man", "nonBinary", "selfDescribed", "preferNotToSay"] as const;
const NOTIFICATION_CHANNELS = ["newMatches", "messages", "messageRequests", "likes", "calls"] as const;

const genderSchema = new Schema(
  {
    kind: { type: String, enum: GENDER_KINDS, required: true },
    /** Free text, and ONLY valid for `selfDescribed`. */
    label: { type: String, trim: true, maxlength: 40 },
  },
  { _id: false },
);

/**
 * `label` is required for `selfDescribed` and forbidden for every other kind.
 * Expressed as a path validator rather than a hook so it also runs on
 * `validate()` of a parent document and on `runValidators` updates.
 */
genderSchema.path("label").validate({
  validator: function (this: { kind?: string }, label: string | undefined) {
    const kind = this.kind;
    if (kind === "selfDescribed") return Boolean(label?.trim());
    return !label;
  },
  message: "gender.label is required for selfDescribed and invalid otherwise",
});

const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    /** [longitude, latitude] — GeoJSON order, not the other one. */
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          v.length === 2 &&
          typeof v[0] === "number" &&
          typeof v[1] === "number" &&
          v[0] >= -180 &&
          v[0] <= 180 &&
          v[1] >= -90 &&
          v[1] <= 90,
        message: "coordinates must be [longitude, latitude] within valid ranges",
      },
    },
  },
  { _id: false },
);

/**
 * Sub-schemas rather than inline nesting, so they are always present on a
 * document. Mongoose types an inline nested object as possibly undefined,
 * which forces a `?.` at every call site and makes "preferences always exist"
 * something the code has to keep re-proving.
 */
const preferencesSchema = new Schema(
  {
    /** "Show me on app" (A11). Enforced server-side — it changes what OTHERS see. */
    discoverable: { type: Boolean, default: true },
    notifications: {
      type: Map,
      of: Boolean,
      default: () => new Map(NOTIFICATION_CHANNELS.map((c) => [c, true])),
    },
    notificationPrimerShown: { type: Boolean, default: false },
  },
  { _id: false },
);

const entitlementsSchema = new Schema(
  {
    isPremium: { type: Boolean, default: false },
    since: { type: Date, default: null },
    /** The durable reset boundary. The counter itself lives in Redis. */
    quotaResetAt: { type: Date, default: null },
  },
  { _id: false },
);

/**
 * Same split as `phone`: the plaintext is for display, the HMAC is what is
 * indexed and looked up, so a dump of the index is not a mailing list.
 */
const emailSchema = new Schema(
  {
    /** Lower-cased and trimmed. Never indexed. */
    address: { type: String, required: true, maxlength: 254 },
    /** HMAC of `address`. THIS is what sign-in looks up. */
    hmac: { type: String, required: true },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    /** Null on accounts created by the older phone + OTP sign-in. */
    email: { type: emailSchema, default: null },
    /**
     * scrypt, via `utils/password.ts`. `select: false` so no query, serializer
     * or admin listing can return it by accident — sign-in asks for it by name.
     * Null on OTP-era accounts, which therefore cannot sign in with a password.
     */
    passwordHash: { type: String, default: null, select: false },

    phone: {
      /** Plaintext, because Settings → Account has to show it. Never indexed. */
      e164: { type: String, required: true },
      /** HMAC of e164. THIS is what is indexed and looked up. */
      hmac: { type: String, required: true },
      countryCode: { type: String, required: true },
      national: { type: String, required: true },
      display: { type: String, required: true },
    },

    name: { type: String, trim: true, maxlength: 40, default: "" },
    /** Derived. What `/profiles/search` actually queries. */
    nameLower: { type: String, default: "" },

    birthday: { type: Date, default: null },
    gender: { type: genderSchema, default: () => ({ kind: "preferNotToSay" }) },
    showGender: { type: Boolean, default: true },
    /** Derived from gender + showGender. The ONLY gender a public read may use. */
    publicGenderKind: { type: String, enum: GENDER_KINDS, default: "preferNotToSay" },

    avatarId: { type: String, default: "" },
    bio: { type: String, trim: true, maxlength: 300, default: "" },
    interestIds: { type: [String], default: [] },

    location: {
      point: { type: pointSchema, default: null },
      city: { type: String, trim: true, maxlength: 80 },
    },

    /** IANA name. Needed to compute the user's local midnight for the quota. */
    timezone: { type: String, default: "Etc/UTC" },

    lastActiveAt: { type: Date, default: () => new Date() },

    preferences: { type: preferencesSchema, required: true, default: () => ({}) },
    entitlements: { type: entitlementsSchema, required: true, default: () => ({}) },

    onboardingComplete: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["active", "pendingDeletion", "erased"],
      default: "active",
    },
    deletionRequestedAt: { type: Date, default: null },
    /** When the erasure job may run. Swept by a job, never by a TTL index. */
    purgeAt: { type: Date, default: null },
    deletionReason: { type: String, maxlength: 200, default: null },

    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    // Unknown fields THROW. This is what makes "no photo fields" enforceable.
    strict: "throw",
    strictQuery: true,
    minimize: false,
  },
);

/**
 * Indexes. Applied by `scripts/migrate.ts`, never built implicitly at boot —
 * an index build under load on a live collection is a self-inflicted outage.
 *
 * The phone index is PARTIAL because erasure nulls `phone.hmac`, and a plain
 * unique index would then collide on the second erased account.
 */
userSchema.index(
  { "phone.hmac": 1 },
  { unique: true, partialFilterExpression: { "phone.hmac": { $type: "string" } }, name: "phone_hmac_unique" },
);

/** Partial for the same reason as the phone index, and for OTP-era accounts with no email. */
userSchema.index(
  { "email.hmac": 1 },
  { unique: true, partialFilterExpression: { "email.hmac": { $type: "string" } }, name: "email_hmac_unique" },
);

/**
 * THE discovery index, and deliberately the only geospatial one on this
 * collection: `$geoNear` refuses to guess between two, so a second 2dsphere
 * here would break discovery with "unable to find index for $geoNear query".
 *
 * The two equality prefixes come first so the same index also serves the
 * visibility predicate — every discovery query filters `status: "active"` and
 * `discoverable: true`, so putting them ahead of the geo key means one index
 * covers both rather than Mongo scanning and then discarding.
 */
userSchema.index(
  { status: 1, "preferences.discoverable": 1, "location.point": "2dsphere" },
  { name: "discovery_geo" },
);

/** Name search. `nameLower` is derived on save so the query needs no collation. */
userSchema.index({ nameLower: 1 }, { name: "name_search" });

/** Interest filter, and later the shared-interest count. */
userSchema.index({ interestIds: 1 }, { name: "interest_filter" });

/** `activeRecently`, and the presence sweep. */
userSchema.index({ lastActiveAt: -1 }, { name: "recent_activity" });

/** The erasure sweeper. Deliberately NOT a TTL — see the model header. */
userSchema.index(
  { status: 1, purgeAt: 1 },
  { partialFilterExpression: { status: "pendingDeletion" }, name: "pending_deletion_sweep" },
);

/** Derived fields. Never accept these from a caller. */
userSchema.pre("save", function () {
  this.nameLower = (this.name ?? "").trim().toLowerCase();
  this.publicGenderKind = this.showGender ? (this.gender?.kind ?? "preferNotToSay") : "preferNotToSay";
});

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const UserModel = model("User", userSchema);
export { NOTIFICATION_CHANNELS, GENDER_KINDS };
