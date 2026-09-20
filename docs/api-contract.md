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
| `unauthorized` | 401 | Missing or expired token — client signs out |
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

---

## Auth

Phone + OTP only. No password, no email, no social sign-in.

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/auth/code` | `{ countryCode, phoneNumber }` | `{ resendAfterSec }` |
| `POST` | `/auth/verify` | `{ countryCode, phoneNumber, code }` | `Session` |
| `POST` | `/auth/onboarding/complete` | — | `Session` |
| `POST` | `/auth/signout` | — | `204` |

`Session` = `{ userId, token, phone, onboardingComplete, createdAt }`.

`phone` is the number the session was opened with, formatted `+91 98765 43210`.
Settings → Account displays it, and it is the only identifier this product
has — there is no email, password or social login anywhere.

---

## Me

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me` | — | `User` |
| `PATCH` | `/me` | partial `User` | `User` |
| `DELETE` | `/me` | `{ reason? }` | `204` |

Patchable: `name`, `birthday`, `gender`, `showGender`, `avatarId`, `bio`,
`interestIds`, `location`.

`gender` is a tagged union — `{ kind: "selfDescribed", label }` carries free
text; every other kind carries no payload. `showGender: false` means the server
must omit gender from that user's `PublicProfile` for everyone else.

---

## Discovery

| Method | Path | Query | Returns |
|---|---|---|---|
| `GET` | `/profiles` | `maxDistanceMetres`, `minAge`, `maxAge`, `interestIds[]`, `activeRecently`, `cursor` | `Paginated<PublicProfile>` |
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
| `POST` | `/threads/:id/messages` | `{ body }` | `Message` |
| `POST` | `/messages/:id/reactions` | `{ emoji }` | `Message` |
| `POST` | `/threads/:id/read` | — | `204` |
| `PATCH` | `/threads/:id` | `{ muted }` | `Thread` |

- Unmatching keeps the `Match` row with `endedAt` set, so the pair cannot
  resurface in discovery. The thread and its messages are deleted for **both**
  sides.
- `Message.kind` is `text` or `system`. `system` is written by the server, not a
  user — currently only call records.
- Reactions are one emoji per user per message; posting the same emoji twice
  removes it.

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

---

## Notifications & safety

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/notifications` | — | `AppNotification[]` |
| `POST` | `/notifications/read` | — | `204` |
| `POST` | `/blocks` | `{ userId }` | `Block` |
| `DELETE` | `/blocks/:userId` | — | `204` |
| `GET` | `/blocks` | — | `Block[]` |
| `POST` | `/reports` | `{ reportedUserId, reason, details?, alsoBlock }` | `Report` |

`reason` is one of `romanticAdvance`, `harassment`, `inappropriateContent`,
`spamOrScam`, `fakeProfile`, `underage`, `other`.

`romanticAdvance` exists because this product is platonic-only. It is a
first-class report reason, not an afterthought, and moderation should treat it
as a genuine violation rather than a preference mismatch.

Blocking is symmetric and immediate: neither party sees the other in discovery,
search, likes or chat afterwards.

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

## Still open

- Push notification delivery (token registration, payload shape). The client
  primes the OS permission after the first match (A4); the transport is undecided.
- Real-time transport for chat — polling vs WebSocket. The mock layer is
  request/response, so either can be added without changing these shapes.
- Media, if photos are ever introduced. They are explicitly out of scope, and
  R8 notes this is an untested product hypothesis.
