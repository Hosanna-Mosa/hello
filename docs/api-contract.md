# API contract

The backend does not exist yet. This document is what it should be built
against; the app's mock service layer in `app/src/services/` already implements
these shapes, so swapping mocks for HTTP should not change anything above the
service boundary.

Source of truth for types: `app/src/services/types.ts`.

---

## Conventions

- **Base URL** — `https://<host>/v1`
- **Auth** — `Authorization: Bearer <token>` on everything except `POST /auth/*`
- **Content type** — `application/json; charset=utf-8`
- **Timestamps** — ISO-8601 UTC with milliseconds (`2026-09-19T14:32:00.000Z`)
- **Dates** — ISO-8601 date only (`1998-03-14`) for birthdays
- **Distance** — metres, integer. The client formats it; the server never sends
  a formatted string
- **IDs** — opaque strings. The client never parses them

### Non-negotiable

**There are no photo fields anywhere.** No `photoUrl`, `photos[]`, `media`, or
`avatarUrl`. A user's avatar is `avatarId`, referencing a fixed preset set. If
the API ever returns an image URL for a person, a product decision has changed.

**Everyone is 18 or over.** The server must reject a birthday under 18 with
`validation`, not merely hide the user. The client checks too; neither check
replaces the other.

**Messaging is match-gated.** There is no endpoint that sends a message to
someone you are not matched with. The only way into a thread is a mutual like or
an accepted message request.

---

## Errors

Non-2xx responses carry:

```json
{ "error": { "code": "quotaExceeded", "message": "You're out of likes for today" } }
```

| `code` | HTTP | Meaning |
|---|---|---|
| `validation` | 400 | Bad input. `message` is safe to show the user |
| `unauthorized` | 401 | Missing or expired token. The client attempts `POST /auth/refresh` **once** and replays the request; it signs out only if the refresh itself fails |
| `notFound` | 404 | Unknown id |
| `rateLimited` | 429 | Too many requests |
| `quotaExceeded` | 429 | Daily like limit spent. Drives the out-of-likes screen |
| `server` | 5xx | Client shows the generic retry state |
| `network` | — | Client-side only; never sent by the server |

---

## Pagination

Cursor-based. Opaque cursor, returned as `nextCursor`, passed back as `?cursor=`.
`null` means no further pages.

```json
{ "items": [], "nextCursor": "eyJvIjoxMn0" }
```

The cursor is **signed and opaque**. It is not an offset, and the client must
never construct, parse or mutate one.

- It encodes a **position in a total order** (a keyset), not a row number, so a
  profile inserted between two page fetches can neither be skipped nor repeated.
- It is bound to the caller. A cursor lifted from one account and replayed on
  another is rejected with `validation`.
- It may expire. A cursor whose underlying snapshot has aged out resumes from
  the nearest equivalent position rather than failing.

---

## Auth

Sign-up with name + email + phone + password; sign-in with email-or-phone +
password. The store-review credential (`REVIEW_LOGIN_*`) is also accepted by
`/auth/login`, and still by `/auth/email`. No social sign-in exists.

Phone + OTP (`/auth/code`, `/auth/verify`) is mounted **only when
`OTP_LOGIN_ENABLED=true`** — off in every deployment, on in the backend test
suite. A verified code creates an account with no password, so leaving it on
would be a second, password-less way in.

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/auth/signup` | `{ name, email, countryCode, phoneNumber, password, timezone? }` | `201 Session` (`onboardingComplete: false`) — taken email / number, or a weak password → `400 validation` with a message safe to show |
| `POST` | `/auth/login` | `{ identifier, password, timezone? }` | `Session` — any failure about the pair → `400 validation` "That email, phone number or password isn't right." |
| `POST` | `/auth/code` | `{ countryCode, phoneNumber }` | `{ resendAfterSec }` — only with `OTP_LOGIN_ENABLED` |
| `POST` | `/auth/verify` | `{ countryCode, phoneNumber, code, timezone? }` | `Session` — only with `OTP_LOGIN_ENABLED` |
| `POST` | `/auth/email` | `{ email, password, timezone? }` | `Session` — wrong pair, unset config, or missing target account → `400 validation` |
| `POST` | `/auth/refresh` | `{ refreshToken }` | `{ token, refreshToken, expiresIn }` |
| `POST` | `/auth/onboarding/complete` | — | `Session` |
| `POST` | `/auth/signout` | — | `204` |

`Session` = `{ userId, token, refreshToken, expiresIn, phone, onboardingComplete, createdAt }`.

### Passwords

- `password` at sign-up: 8–128 characters, at least one letter and one digit.
- `identifier` is an email (matched case-insensitively) or a phone number in
  E.164 (`+919876543210`). The app reads a bare number as `+91`.
- Stored as scrypt (`utils/password.ts`), never returned by any endpoint
  (`select: false` on the model). Email and phone are looked up by a peppered
  HMAC, never by the plaintext.
- `/auth/login` gives an unknown account, a wrong password, an erased account
  and a pre-password (OTP-era) account the **same** answer in about the same
  time, so it cannot be used to discover who is registered. `/auth/signup`
  does say an email or number is taken — rate limited per IP.
- Rate limits: login 20 / 15 min per IP **and** 10 / 15 min per account;
  sign-up 10 / hour per IP.

### Tokens

`token` is a **short-lived access token** (15 minutes). `refreshToken` lasts 30
days and is the only way to mint a new one.

- The refresh token **rotates on every use** — the old one dies the moment a new
  one is issued.
- Presenting an **already-used** refresh token is treated as theft: the entire
  session family is revoked and that device must sign in again. A legitimate
  client never does this.
- `POST /auth/signout` revokes the refresh token immediately. The access token
  is additionally denylisted, so signing out takes effect at once rather than up
  to 15 minutes later.
- `timezone` is an IANA name (`Europe/London`) captured from the device. The
  server needs it to compute the user's local midnight for the daily like quota.
  See **Billing**.

`phone` is the account's number, formatted `+91 98765 43210`. Settings →
Account displays it.

---

## Me

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me` | — | `User` |
| `PATCH` | `/me` | partial `User` | `User` |
| `DELETE` | `/me` | `{ reason? }` | `204` |


Patchable: `name`, `birthday`, `gender`, `showGender`, `avatarId`, `bio`,
`interestIds`, `location`, `timezone`.

`gender` is a tagged union — `{ kind: "selfDescribed", label }` carries free
text; every other kind carries no payload.

**`showGender: false` COERCES, it does not omit.** That user's `PublicProfile`
reports `gender: { kind: "preferNotToSay" }` to everyone else. Two reasons:
`PublicProfile.gender` is required in `types.ts`, and an omitted field is itself
a signal — "this person is hiding something" — whereas a coerced one is
indistinguishable from a genuine preference, which is the actual privacy goal.

### Deletion and retention

`DELETE /me` is a **soft delete with a 30-day grace period**.

- Immediately: the account is hidden everywhere — discovery, search, likes,
  matches, chat. To everyone else the user is gone.
- Within 30 days: **signing in again restores the account intact** — same
  number, same profile. That is the only restore path, and it needs no token,
  which is just as well because deletion revokes every session. There is
  deliberately no `POST /me/restore`: nobody could hold a valid token to call
  it, and an endpoint nobody can reach reads as a working feature.
- The account stops working **immediately**, including any access token already
  issued. Deletion revokes the refresh tokens, and the account's own state is
  checked on every request — a still-valid signature is not enough.
- After 30 days: a background job erases the record, anonymises authored
  messages, and deletes threads, likes and notifications.
- Deletion changes `status` and **nothing else**. It does not touch
  `preferences.discoverable`: hiding the account is `status != "active"`, which
  every discovery query already filters on. Flipping the preference as well
  would overwrite a choice the user may have made themselves, and restoring
  could not tell the two apart — the account would come back permanently
  invisible.
- **Reports are retained**, with their evidence snapshot, past the erasure of
  either party. A moderation record that vanishes when the reported account is
  deleted is worse than no record.
- Erasure is a job, never a TTL index: a TTL would drop the user document
  without running the cascade, orphaning threads, likes and report evidence.

---

## Reference data

Small, static, and read before a profile exists — so these three are
unauthenticated and returned whole rather than paginated. A cursor over 60 rows
is ceremony.

| Method | Path | Returns |
|---|---|---|
| `GET` | `/interests` | `Interest[]` |
| `GET` | `/avatars` | `Avatar[]` |
| `GET` | `/plans` | `Plan[]` |

Retired rows are excluded. A profile that still references one keeps working —
the id resolves — but nobody can pick it again.

**Interest ids are minted once and stored, never derived from the label at
request time.** The app currently slugifies the label on read, which makes the
id a function of the display text: renaming a tag silently orphans every profile
that referenced it. It also mangles accents — "Board game cafés" became
`board-game-caf-s`. The server's id is `board-game-cafes`, with the old form
kept in `aliases` so existing references still resolve.

`Avatar` carries no URL and never will. It is an id into a fixed preset set that
the client resolves to a bundled asset; the moment it carries a URL, "no photos
anywhere" has quietly become false.

---

## Discovery

| Method | Path | Query | Returns |
|---|---|---|---|
| `GET` | `/profiles` | `maxDistanceMetres`, `minAge`, `maxAge`, `interestIds[]`, `activeRecently`, `genders[]`, `cursor` | `Paginated<PublicProfile>` |
| `GET` | `/profiles/count` | same, no cursor | `{ count }` |
| `GET` | `/profiles/:id` | — | `PublicProfile` |
| `GET` | `/profiles/search` | `q` | `PublicProfile[]` |

- `minAge` floors at 18 regardless of what is sent.
- Search matches **name only** — not bios, not interests.
- Blocked users are excluded server-side from every one of these.
- `PublicProfile` carries `age` and `distanceMetres` and omits `birthday` and
  `location`. The client must never receive another user's coordinates.

---

## Likes & requests

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/likes` | `{ toUserId, note? }` | `{ like, match \| null }` |
| `GET` | `/likes/inbound` | — | `Like[]` |
| `GET` | `/requests` | `?status=pending` | `MessageRequest[]` |
| `POST` | `/requests/:id/accept` | — | `Match` |
| `POST` | `/requests/:id/decline` | — | `204` |

- A like **with** a note creates a `MessageRequest` for the recipient. A like
  without one is silent.
- `POST /likes` spends one from the daily quota and returns `quotaExceeded` when
  it is gone. It must be atomic: a rejected like is not recorded.
- Accept creates the `Match` **and** its `Thread`, seeded with the note as the
  first message.
- Decline is silent. The sender is never notified and must not be able to infer
  it (A18).

---

## Matches & chat

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/matches` | — | `Match[]` |
| `DELETE` | `/matches/:id` | — | `204` |
| `GET` | `/threads` | — | `Thread[]` |
| `GET` | `/threads/:id/messages` | `?cursor=` | `Paginated<Message>` |
| `POST` | `/threads/:id/messages` | `{ body, clientMessageId? }` | `Message` |
| `POST` | `/threads/:id/voice` | raw audio (`audio/mp4`), `?durationSec=&clientMessageId=` | `Message` |
| `GET` | `/messages/:id/voice` | — | the audio (`audio/mp4`, supports `Range`) |
| `POST` | `/messages/:id/reactions` | `{ emoji }` | `Message` |
| `POST` | `/threads/:id/read` | — | `204` |
| `PATCH` | `/threads/:id` | `{ muted }` | `Thread` |

- Unmatching keeps the `Match` row with `endedAt` set, so the pair cannot
  resurface in discovery. The thread and its messages are deleted for **both**
  sides.
- `Message.kind` is `text`, `system` or `voice`. `system` is written by the
  server, not a user — currently only call records.
- **Voice messages.** The upload body is the recording itself — an MP4/M4A
  container, sniffed server-side (`ftyp`), at most `VOICE_MAX_BYTES` (2 MB) and
  `VOICE_MAX_SEC` (120 s). The response is a `voice` message whose
  `voice: { url, durationSec }` points at `GET /messages/:id/voice`; `body` is
  "Voice message" for previews. The stream needs the bearer token and answers
  `notFound` to anyone outside the conversation, exactly like the thread. Audio
  is deleted with its conversation (unmatch, block).
- Reactions are one emoji per user per message; posting the same emoji twice
  removes it.
- **Messages page newest-first**, 30 per page. A chat opens at the bottom, so
  descending order makes the first page the one the reader actually needs.
- `clientMessageId` makes sending **idempotent**. A mobile client that retries a
  request it never saw the response to gets the original message back rather
  than posting twice. Sending without one is allowed but not retry-safe.
- **`Message.status` is derived per viewer, never stored.** The server keeps a
  delivered and a read cursor per participant; `sent` / `delivered` / `read` are
  computed against the *other* participant's cursors when serializing your own
  outbound message. `sending` and `failed` are client-only states and are never
  returned by the server. This is why marking a 200-message thread read is one
  write rather than 200.

---

## Calls

Voice only. No video, ever. The current build mocks these entirely (A17); the
contract is here so the shape is agreed before real infrastructure is chosen.

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/calls` | `{ threadId, direction }` | `CallSession` |
| `POST` | `/calls/:id/end` | `{ outcome, durationSec }` | `CallSession` |
| `GET` | `/calls` | `?threadId=` | `CallSession[]` |

A `completed` call with `durationSec > 0` appends a `system` message to the
thread: `Voice call · 2:14`. Missed, declined and cancelled calls do not.

---

## Billing

Placeholder. No provider chosen (A15), and **R13 applies**: App Store rules
require real in-app purchase, stated price/period/renewal terms, and a working
Restore before this can ship.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/entitlements` | — | `Entitlements` |
| `GET` | `/plans` | — | `Plan[]` |
| `POST` | `/purchases/restore` | — | `Entitlements` |

`Entitlements.likesRemaining` is the free daily allowance (15, A16) and resets
at the user's local midnight — `likesResetAt` is the authority, and the client
counts down to it.

**Premium sends `likesRemaining: -1`, not `Infinity`.** `JSON.stringify(Infinity)`
is `null`, so infinity cannot survive the wire; `-1` is the unlimited sentinel.
`likesLimit` carries the ceiling (`15`, or `-1` when unlimited) so the client can
render "12 of 15" without hardcoding the number.

Local midnight is computed from `User.timezone` with real zone rules, not a
fixed UTC offset — an offset is wrong twice a year in any country that observes
daylight saving. The reset boundary is stored server-side when the day's quota
is first spent, so changing timezone mid-day cannot grant a second allowance.

Spending a like is **atomic with recording it**: a like rejected for quota is
never written. The check and the decrement are a single operation, and every
later failure refunds it, so a re-like costs nothing.

---

## Notifications & safety

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/notifications` | — | `AppNotification[]` |
| `POST` | `/notifications/read` | — | `204` |
| `POST` | `/blocks` | `{ userId }` | `Block` |
| `DELETE` | `/blocks/:userId` | — | `204` |
| `GET` | `/blocks` | — | `Block[]`, each with an embedded `user` summary |
| `POST` | `/reports` | `{ reportedUserId, reason, details?, alsoBlock }` | `Report` |

`reason` is one of `romanticAdvance`, `harassment`, `inappropriateContent`,
`spamOrScam`, `fakeProfile`, `underage`, `other`.

`romanticAdvance` exists because this product is platonic-only. It is a
first-class report reason, not an afterthought, and moderation should treat it
as a genuine violation rather than a preference mismatch.

Blocking is symmetric and immediate: neither party sees the other in discovery,
search, likes or chat afterwards.

It is also a **teardown, not a filter**. `POST /blocks` ends any active match,
deletes the thread and its messages, and removes the likes and pending requests
in both directions — then emits `thread:ended` to both parties, so a phone with
the conversation open closes it rather than sitting on a thread that no longer
exists. `POST /reports` with `alsoBlock` does all of the same.

`GET /blocks` embeds a `user` profile summary on each row. A blocked user is
excluded from `GET /profiles/:id` by definition, so without it the one screen
that must name them could not. Its `distanceMetres` is always `0`.

Unblocking undoes **only your own** block. If the other person also blocked
you, theirs stands and you remain hidden from each other.

A report's evidence is a **snapshot** taken before any block runs — the name,
bio and the last 20 messages — because the block deletes the conversation and
erasure removes the profile. Nothing about a report is ever returned to the
reporter beyond the receipt of their own filing, and nothing is ever sent to
the person reported.

---

## Support

A user can open any number of tickets; each is one problem with its own
conversation with the support team, answered from the admin panel.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/support/tickets` | — | `SupportTicket[]`, most recent activity first |
| `POST` | `/support/tickets` | `{ subject, category, message, clientMessageId? }` | `201` `SupportTicketDetail` |
| `GET` | `/support/tickets/:id` | — | `SupportTicketDetail` — and the ticket is now read |
| `POST` | `/support/tickets/:id/messages` | `{ body, clientMessageId? }` | `SupportTicketDetail` (the appended message(s)) |
| `POST` | `/support/tickets/:id/read` | — | `SupportTicket` |
| `POST` | `/support/tickets/:id/resolution` | `{ accept: boolean }` | `SupportTicketDetail` |

```ts
type SupportCategory = "account" | "safety" | "technical" | "billing" | "feedback" | "other";
type SupportTicketStatus = "open" | "pendingResolution" | "resolved";
type SupportTicketDetail = { ticket: SupportTicket; messages: SupportMessage[] };
```

**The lifecycle, and who may move it:**

```
open ──(support: Resolve)──▶ pendingResolution ──(user: yes)──▶ resolved
  ▲                                 │
  └──── (user: not yet, or writes another message) ────┘
```

- Support can only **ask** to resolve. The ticket closes when the **user**
  answers yes (`POST …/resolution { accept: true }`), never over their head.
- `accept: false` reopens it. So does the user simply writing again while
  support waits — replying "it's still broken" *is* the answer.
- `resolved` is final: both sides are refused new messages (`400`), and a new
  problem is a new ticket.
- Every change of status appends a `system` message with an `event`
  (`resolutionRequested` / `resolutionAccepted` / `resolutionDeclined`), in the
  same transaction as the status change, so history and status never disagree.
- Answering the same way twice is a no-op, not an error.
- Someone else's ticket is `404`, never `403`.
- `clientMessageId` makes create and send idempotent: a retry returns the
  original rather than storing twice. Rate limits: 10 new tickets/hour, and the
  chat send limit for messages.

The user never sees which operator replied — `author` is `"admin"`, full stop.

---

## Preferences

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me/preferences` | — | `Preferences` |
| `PATCH` | `/me/preferences` | `Partial<Preferences>` | `Preferences` |

```ts
type NotificationChannel =
  | "newMatches" | "messages" | "messageRequests" | "likes" | "calls";

type Preferences = {
  discoverable: boolean;
  notifications: Record<NotificationChannel, boolean>;
  notificationPrimerShown: boolean;
};
```

`discoverable` is "show me on app" (A11) and is enforced **server-side**: it
changes what other people see, so a client that filtered on it locally would be
hiding the wrong side of the relationship. Off removes the user from discovery,
search and the deck without deleting anything.

`notifications` is per channel rather than one switch, because a single on/off
is what makes people turn everything off.

`notificationPrimerShown` is what stops the OS permission primer asking twice.
The primer fires once, after the first match (A4).

---

## Real-time

**Decided: Socket.IO**, not polling. Typing indicators and a ringing incoming
call are already built in the UI, and neither survives a poll interval.

The REST shapes above do not change. Sockets carry the same objects; they only
remove the wait. Every socket handler calls the same service layer as its REST
equivalent, so the two can never disagree about a rule.

- The access token is sent in the connection handshake, **never in the query
  string**, which lands in proxy logs.
- Durable events (a new message, a new match, a new request) are addressed to
  the user, so they arrive on every device that user has signed in on.
- Ephemeral signals (typing) are addressed to the thread and expire by
  themselves, so a dropped connection cannot leave someone "typing…" forever.
- **There is no decline event, and there never will be.** A18 says a declined
  request must not be inferable by the sender; that is enforced by the absence
  of a channel, not by client discipline.

### Support events

On the app's connection (`/`):

| Direction | Event | Payload |
|---|---|---|
| server → | `support:message:new` | `{ ticketId, message: SupportMessage }` — including your own, echoed to your other devices |
| server → | `support:ticket:updated` | `{ ticket: SupportTicket }` |
| server → | `support:typing` | `{ ticketId, author: "admin", isTyping }` — only while subscribed |
| → server | `support:subscribe` / `support:unsubscribe` | `{ ticketId }` — ownership checked |
| → server | `support:message:send` | `{ ticketId, body, clientMessageId }`, acked with `SupportTicketDetail` or `{ error }` |
| → server | `support:typing` | `{ ticketId, isTyping }` |

The admin panel uses its own namespace, **`/admin`**, authenticated with a
one-minute ticket from `GET /v1/admin/auth/socket-ticket` (the session cookie
is HttpOnly and path-scoped, so it cannot reach the handshake). The socket is
closed when that session signs out or expires. Operators receive every
ticket's `support:message:new` / `support:ticket:updated` (admin shapes, with
the user summary and `adminId`), and send `support:message:send`,
`support:typing` and `support:read`.

## Still open

- Push notification payload shape. `expo-notifications` is approved and device
  token registration is `POST /me/devices`, but the payload is not yet pinned
  down. Note that sockets only deliver while the app is open — push is what
  covers a closed app, so the two are complementary, not alternatives.
- Media, if photos are ever introduced. They are explicitly out of scope, and
  R8 notes this is an untested product hypothesis.
