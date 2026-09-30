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
  /**
   * The palette-ish handle the id has always carried — "Sunrise", "Meadow".
   *
   * Never rendered and never read aloud. It exists so fixtures, logs and test
   * names can refer to an avatar by something more memorable than `avatar-14`.
   * Optional because the server does not send it: it is a client-side nicety,
   * not part of the record.
   */
  name?: string;
  /**
   * What the picture shows — "Wearing a hijab, medium skin".
   *
   * This is what reaches `accessibilityLabel`, so it has to describe the
   * person. A screen-reader user choosing between thirty avatars learns
   * nothing from hearing "Sunrise".
   */
  label: string;
  /** Local asset module. Undefined only where artwork has not been bundled. */
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

/**
 * Where you stand with one person — what their profile's main button does.
 *
 *   none       nothing between you           → "Send request"
 *   requested  you liked / sent a request    → "Request sent" (disabled)
 *   incoming   they sent YOU a request       → "Accept request"
 *   matched    an active match               → "Message"
 *
 * A request they DECLINED still reads `requested`, forever: a sender must never
 * be able to infer a decline (A18). A silent like from them is NOT surfaced as
 * `incoming` either — seeing who liked you is a premium feature, and a profile
 * button must not become a way around it.
 */
export type ConnectionStatus = "none" | "requested" | "incoming" | "matched";

export type Connection = {
  status: ConnectionStatus;
  /** Set when `matched` — the conversation to open. */
  threadId: string | null;
  /** Set when `incoming` — the request to accept. */
  requestId: string | null;
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
  /**
   * The newest message, denormalised onto the thread.
   *
   * The conversation list renders a snippet per row, and fetching that per row
   * is the N+1 this field exists to prevent — one request for the whole list
   * rather than one per conversation.
   *
   * `null` is MEANINGFUL, not missing data: it is a match where nobody has
   * said anything yet, which the Chat tab shows in "New matches" rather than
   * as a conversation. Optional because the mock builds previews from its own
   * message list and has no need to denormalise anything.
   *
   * `reactions` is always empty here — the row shows a body and a time, and
   * copying reactions onto every thread write to render neither would be
   * denormalisation for its own sake. Read the thread for the real ones.
   */
  lastMessage?: Message | null;
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
 *
 * `voice` is a recorded voice message; its audio is in `Message.voice`, and
 * `body` holds a plain-text stand-in ("Voice message") for previews.
 */
export type MessageKind = "text" | "system" | "voice";

/**
 * A voice message's audio.
 *
 * `url` is a path on the API (`/v1/messages/:id/voice`) that needs the bearer
 * token, because only the two people in the conversation may play it. In mock
 * mode it is the local file the recording was saved to.
 */
export type VoiceClip = {
  url: string;
  durationSec: number;
};

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  kind: MessageKind;
  body: string;
  /** Present exactly when `kind` is `"voice"`. */
  voice?: VoiceClip;
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
  /**
   * Who the block is about.
   *
   * The blocked list has to show a name, and a blocked user is excluded from
   * `GET /profiles/:id` BY DEFINITION — so the one screen that must look them
   * up cannot. Embedding the summary is what makes that screen possible while
   * keeping the exclusion absolute.
   *
   * `distanceMetres` is always 0 here: where someone you blocked is standing
   * is not this screen's business. Optional because the mock resolves the
   * profile locally instead.
   */
  user?: PublicProfile | null;
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
// Support
// ---------------------------------------------------------------------------

/** What a ticket is about. Picked by the user when they open it. */
export type SupportCategory = "account" | "safety" | "technical" | "billing" | "feedback" | "other";

/**
 * Where a ticket is in its life. It only ever moves along these edges:
 *
 *   open ──(support: "resolve")──▶ pendingResolution ──(user: "yes")──▶ resolved
 *     ▲                                   │
 *     └──────(user: "not yet", or the user writes another message)──┘
 *
 * Support can only ASK to resolve. The ticket closes when the user agrees, so a
 * problem is never marked fixed over the head of the person who has it.
 * `resolved` is final — both sides become read-only, and a new problem is a
 * new ticket.
 */
export type SupportTicketStatus = "open" | "pendingResolution" | "resolved";

/** Who wrote a support message. `system` lines record a status change. */
export type SupportAuthor = "user" | "admin" | "system";

/** The status change a `system` message records. */
export type SupportEvent = "resolutionRequested" | "resolutionAccepted" | "resolutionDeclined";

export type SupportTicket = {
  id: string;
  subject: string;
  category: SupportCategory;
  status: SupportTicketStatus;
  /** Denormalised so the ticket list needs one request, not one per row. */
  lastMessageAt: IsoDateTime;
  lastMessagePreview: string;
  lastMessageAuthor: SupportAuthor;
  /** Messages from support the user has not seen yet. */
  unreadCount: number;
  /** When support asked to close it; null unless `pendingResolution`. */
  resolutionRequestedAt: IsoDateTime | null;
  resolvedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  author: SupportAuthor;
  body: string;
  /** Set exactly when `author` is `"system"`. */
  event: SupportEvent | null;
  /** Echoed back so an optimistic send can be matched to the stored message. */
  clientMessageId: string | null;
  createdAt: IsoDateTime;
};

/** `GET /support/tickets/:id` — the ticket and its whole conversation. */
export type SupportTicketDetail = {
  ticket: SupportTicket;
  messages: SupportMessage[];
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
  /**
   * The ACCESS token — short-lived (15 minutes). Sent as
   * `Authorization: Bearer <token>` on every request but `POST /auth/*`.
   */
  token: string;
  /**
   * Exchanged at `POST /auth/refresh` for a new access token, and rotated every
   * time it is used. Long-lived (30 days), so it is the one value that must be
   * stored in the device keychain rather than in memory.
   */
  refreshToken: string;
  /** Seconds until `token` expires, so the client can refresh before a 401. */
  expiresIn: number;
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
