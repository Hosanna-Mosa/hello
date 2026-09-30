/**
 * The wire contract.
 *
 * These types are NOT redefined here — they are re-exported from the app's
 * `app/src/services/types.ts`, which `docs/api-contract.md` names as the source
 * of truth. One definition, two consumers: if the server renames a field the
 * app stops compiling, which is the entire point of the backend being
 * TypeScript.
 *
 * Every import here is `import type`, so nothing is emitted and the server
 * ships no code from the app. There is no runtime coupling in either direction.
 *
 * It reads a GENERATED SIBLING rather than reaching across into `app/` directly.
 * That import worked for `tsc --noEmit` and failed for every real build:
 * `tsconfig.build.json` sets `rootDir: ./src`, and TypeScript will not accept a
 * `.ts` input from outside it (TS6059), so `npm run build` had never produced a
 * `dist/` at all (PLAN #176). `scripts/sync-contract.mjs` copies the app's file
 * into `contract.generated.d.ts` — a declaration file, which emits nothing and
 * so is exempt — before every build, and `tests/contract-sync.test.ts` fails if
 * that copy is stale. The app's `types.ts` is still the only definition.
 */

export type {
  IsoDate,
  IsoDateTime,
  Gender,
  Coordinate,
  Location,
  User,
  PublicProfile,
  InterestCategory,
  Interest,
  Avatar,
  Like,
  MessageRequest,
  MessageRequestStatus,
  Match,
  Connection,
  ConnectionStatus,
  Thread,
  Message,
  MessageKind,
  MessageStatus,
  Reaction,
  CallSession,
  CallDirection,
  CallOutcome,
  Entitlements,
  Plan,
  PlanPeriod,
  Block,
  Report,
  ReportReason,
  SupportCategory,
  SupportTicketStatus,
  SupportAuthor,
  SupportEvent,
  SupportTicket,
  SupportMessage,
  SupportTicketDetail,
  AppNotification,
  NotificationKind,
  NotificationChannel,
  Preferences,
  Session,
  ApiErrorCode,
  Paginated,
} from "./contract.generated.js";
