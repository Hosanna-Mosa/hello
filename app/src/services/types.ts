/**
 * Entity types.
 *
 * This is the shape the real backend will be built against — `docs/api-contract.md`
 * documents the same shapes over the wire. Nothing here is UI-specific.
 *
 * Note what is absent: there is no photo, photoUrl, photos[] or media field on
 * `User` or anywhere else. Users are a preset avatar id and nothing more
 * (PLAN §1). If a field like that ever appears, the product decision changed.
 */

/** ISO-8601 timestamp, e.g. "2026-09-19T14:32:00.000Z". */
export type IsoDateTime = string;
/** ISO-8601 date with no time, e.g. "1998-03-14". Used for birthdays. */
export type IsoDate = string;

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** A5 — self-describe and prefer-not-to-say are first-class, not an "other". */
export type Gender =
  | { kind: "woman" }
  | { kind: "man" }
  | { kind: "nonBinary" }
  | { kind: "selfDescribed"; label: string }
  | { kind: "preferNotToSay" };

/** Coarse only. A12: we hold a rough coordinate, and display distance from mock data. */
export type Coordinate = { latitude: number; longitude: number };

export type Location = {
  coordinate: Coordinate;
  /** Shown when the user declines location and types a city instead. */
  city?: string;
};

export type User = {
  id: string;
  name: string;
  birthday: IsoDate;
  gender: Gender;
  /** Whether gender appears on the public profile (A5). */
  showGender: boolean;
  /** References `Avatar.id`. There is no photo field, here or anywhere. */
  avatarId: string;
  bio: string;
  interestIds: string[];
  location: Location;
  lastActiveAt: IsoDateTime;
  createdAt: IsoDateTime;
};

/** A user as seen by someone else: distance resolved, private fields dropped. */
export type PublicProfile = Omit<User, "birthday" | "location" | "showGender"> & {
  age: number;
  /** Metres. Always rendered through `formatDistance`, never as a point. */
  distanceMetres: number;
};

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export type InterestCategory =
  | "outdoors"
  | "food"
  | "games"
  | "music"
  | "creative"
  | "wellbeing"
  | "learning"
  | "nightlife";

export type Interest = {
  id: string;
  label: string;
  category: InterestCategory;
};

export type Avatar = {
  id: string;
  label: string;
  /** Local asset module. Undefined until real artwork lands (A7, R2). */
  asset?: number;
};

// ---------------------------------------------------------------------------
// Liking, requests, matching
// ---------------------------------------------------------------------------

export type Like = {
  id: string;
  fromUserId: string;
  toUserId: string;
  /** Present when sent as "like with a note" — becomes the request's message. */
  note?: string;
  createdAt: IsoDateTime;
};

export type MessageRequestStatus = "pending" | "accepted" | "declined";

export type MessageRequest = {
  id: string;
  likeId: string;
  fromUserId: string;
  toUserId: string;
  note: string;
  status: MessageRequestStatus;
  createdAt: IsoDateTime;
  /** A18: requests do not expire, so this is null until acted on. */
  resolvedAt: IsoDateTime | null;
};

export type Match = {
  id: string;
  userIds: [string, string];
  threadId: string;
  createdAt: IsoDateTime;
  /** Set when either side unmatches; the pair is kept so it cannot recur. */
  endedAt: IsoDateTime | null;
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export type Thread = {
  id: string;
  matchId: string;
  participantIds: [string, string];
  lastMessageAt: IsoDateTime;
  unreadCount: number;
  /** Mutes notifications without unmatching. */
  muted: boolean;
};

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type Reaction = {
  /** A single emoji. */
  emoji: string;
  userId: string;
};

/**
 * `system` messages are written by the app, not a person — currently only the
 * "Voice call · 2:14" record that Phase 7 appends when a call ends.
 */
export type MessageKind = "text" | "system";

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  kind: MessageKind;
  body: string;
  status: MessageStatus;
  reactions: Reaction[];
  createdAt: IsoDateTime;
};

// ---------------------------------------------------------------------------
// Calls — mocked end to end (A17). No audio, no mic permission, no WebRTC.
// ---------------------------------------------------------------------------

export type CallDirection = "outgoing" | "incoming";
export type CallOutcome = "completed" | "missed" | "declined" | "cancelled";

export type CallSession = {
  id: string;
  threadId: string;
  direction: CallDirection;
  startedAt: IsoDateTime;
  /** Zero unless the call was answered. */
  durationSec: number;
  outcome: CallOutcome;
};

// ---------------------------------------------------------------------------
// Money — all placeholder (A15). No billing provider, no real prices.
// ---------------------------------------------------------------------------

export type Entitlements = {
  isPremium: boolean;
  /** A16: 15/day on free, resets at local midnight. Infinity when premium. */
  likesRemaining: number;
  likesResetAt: IsoDateTime;
};

export type PlanPeriod = "month" | "sixMonths" | "year";

export type Plan = {
  id: string;
  label: string;
  /** Minor units (pence/cents). Placeholder — no billing provider chosen. */
  priceMinor: number;
  currency: string;
  period: PlanPeriod;
  /** The "Best value" ribbon. */
  highlighted: boolean;
};

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

export type Block = {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: IsoDateTime;
};

/**
 * "Romantic or flirty advance" is deliberately first in the list. This product
 * is platonic-only, and the report reasons are where that is enforced rather
 * than merely stated (PLAN §1).
 */
export type ReportReason =
  | "romanticAdvance"
  | "harassment"
  | "inappropriateContent"
  | "spamOrScam"
  | "fakeProfile"
  | "underage"
  | "other";

export type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  /** Reporting optionally blocks too. */
  alsoBlocked: boolean;
  createdAt: IsoDateTime;
};

// ---------------------------------------------------------------------------
// Notifications & session
// ---------------------------------------------------------------------------

export type NotificationKind =
  | "newLike"
  | "newMatch"
  | "newMessage"
  | "messageRequest"
  | "missedCall";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  /** Who caused it, when there is someone. */
  actorId?: string;
  body: string;
  /** Typed-route href target, e.g. "/thread/t1". */
  deepLink?: string;
  read: boolean;
  createdAt: IsoDateTime;
};

export type Session = {
  userId: string;
  token: string;
  /**
   * The number this session was opened with, in `+91 98765 43210` form.
   *
   * Stored because Settings → Account has to show it, and it is the only
   * identifier this product has — there is no email, password or social login
   * anywhere (PLAN §1).
   */
  phone: string;
  /** Distinguishes a half-onboarded user from a finished one. */
  onboardingComplete: boolean;
  createdAt: IsoDateTime;
};

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

/**
 * The things a push notification could be about.
 *
 * Per-channel rather than one master switch: "tell me about a new match but
 * not about every message" is the setting people actually want, and a single
 * on/off makes them turn everything off.
 */
export type NotificationChannel =
  | "newMatches"
  | "messages"
  | "messageRequests"
  | "likes"
  | "calls";

export type Preferences = {
  /**
   * "Show me on app" (A11). Off hides you from discovery, search and the deck
   * without deleting anything — the pause button, not the exit.
   *
   * The effect is entirely server-side: it changes what OTHER people see, and
   * there are no other people in a mock. The setting is stored and reflected
   * honestly in the UI rather than faked into a local filter, which would hide
   * other people from you — the opposite of what it means.
   */
  discoverable: boolean;
  notifications: Record<NotificationChannel, boolean>;
  /**
   * Whether the OS notification primer has been shown. It fires once, after
   * the first match (A4), and asking twice is how people learn to say no.
   */
  notificationPrimerShown: boolean;
};

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

/** Mirrors the error codes in `docs/api-contract.md`. */
export type ApiErrorCode =
  | "network"
  | "unauthorized"
  | "notFound"
  | "rateLimited"
  | "quotaExceeded"
  | "validation"
  | "server";

export type Paginated<T> = {
  items: T[];
  /** Opaque; pass back as `cursor`. Null when there is no next page. */
  nextCursor: string | null;
};
