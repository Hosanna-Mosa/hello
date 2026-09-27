/**
 * Opaque, signed pagination cursors.
 *
 * The contract says ids are opaque and "the client never parses them". The
 * app's mock cheats — its cursor is `String(offset)` parsed back with
 * `Number()` — and an offset is not just inelegant, it is WRONG for a feed:
 * insert a profile between two page fetches and an offset silently skips
 * someone, delete one and it repeats someone. Neither shows up as an error.
 *
 * So a cursor encodes a POSITION IN A TOTAL ORDER (a keyset), not a row number.
 * Page two asks for "everything after this exact point", which is stable under
 * inserts and deletes by construction.
 *
 * It is signed for two reasons. A forged cursor would otherwise let a caller
 * seek to arbitrary positions in someone else's result set, and it is bound to
 * the owner so a cursor lifted from one account cannot be replayed on another.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env.js";
import { ApiError } from "@/errors/ApiError.js";

/** Bumped if the payload shape ever changes, so old cursors fail cleanly. */
const VERSION = 1;

export type DiscoveryCursor = {
  v: number;
  /** Owner. A cursor is not transferable between accounts. */
  uid: string;
  /** Last distance seen, in metres — the primary sort key. */
  d: number;
  /** Last id seen, breaking ties at identical distances. */
  i: string;
  /** Hash of the filters, so changing a filter cannot resume mid-stream. */
  f: string;
};

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(payload: string): string {
  return b64url(createHmac("sha256", env.CURSOR_SECRET).update(payload).digest().subarray(0, 16));
}

export function encodeCursor(cursor: Omit<DiscoveryCursor, "v">): string {
  const payload = b64url(Buffer.from(JSON.stringify({ v: VERSION, ...cursor })));
  return `${payload}.${sign(payload)}`;
}

/**
 * Decodes and verifies. Every failure is the same `validation` error: a cursor
 * is machine-generated, so a caller holding a bad one has either tampered with
 * it or kept it across a deploy, and neither deserves a distinguishing message.
 */
export function decodeCursor(raw: string, expectedUid: string, expectedFilterHash: string): DiscoveryCursor {
  const bad = () => ApiError.validation("That page link is no longer valid.");

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) throw bad();

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw bad();

  let parsed: DiscoveryCursor;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as DiscoveryCursor;
  } catch {
    throw bad();
  }

  if (parsed.v !== VERSION) throw bad();
  // Replaying someone else's cursor would page through THEIR feed.
  if (parsed.uid !== expectedUid) throw bad();
  // Changing a filter mid-stream would resume at a position that no longer
  // means anything in the new ordering.
  if (parsed.f !== expectedFilterHash) throw bad();
  if (typeof parsed.d !== "number" || typeof parsed.i !== "string") throw bad();

  return parsed;
}

/** Stable hash of the active filters, so a cursor is scoped to them. */
export function filterHash(filters: unknown): string {
  return createHmac("sha256", env.CURSOR_SECRET)
    .update(JSON.stringify(filters ?? {}))
    .digest("hex")
    .slice(0, 12);
}

// ---------------------------------------------------------------------------
// Message cursors
// ---------------------------------------------------------------------------

/**
 * A position in a thread's message list.
 *
 * Bound to the THREAD as well as the caller. Without `tid`, a cursor from one
 * conversation could be replayed into another — the signature would still
 * verify, and the keyset would silently resolve against the wrong messages.
 */
export type MessageCursor = {
  v: number;
  uid: string;
  tid: string;
  /** `createdAt` in epoch ms — the primary sort key. */
  t: number;
  /** Last id seen, breaking ties within the same millisecond. */
  i: string;
};

export function encodeMessageCursor(cursor: Omit<MessageCursor, "v">): string {
  const payload = b64url(Buffer.from(JSON.stringify({ v: VERSION, ...cursor })));
  return `${payload}.${sign(payload)}`;
}

export function decodeMessageCursor(raw: string, expectedUid: string, expectedThreadId: string): MessageCursor {
  const bad = () => ApiError.validation("That page link is no longer valid.");

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) throw bad();

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw bad();

  let parsed: MessageCursor;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as MessageCursor;
  } catch {
    throw bad();
  }

  if (parsed.v !== VERSION) throw bad();
  if (parsed.uid !== expectedUid) throw bad();
  if (parsed.tid !== expectedThreadId) throw bad();
  if (typeof parsed.t !== "number" || typeof parsed.i !== "string") throw bad();

  return parsed;
}
