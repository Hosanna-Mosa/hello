/**
 * Blocks and reports -> wire types.
 *
 * A `Report` never goes back to the reporter beyond the receipt of their own
 * filing: no status, no outcome, no evidence. Everything moderation needs
 * lives in the document and nothing else leaves the server.
 */

import type { Block, PublicProfile, Report, ReportReason } from "@/types/wire.js";
import type { BlockDoc } from "@/models/block.model.js";
import type { ReportDoc } from "@/models/report.model.js";
import type { UserDoc } from "@/models/user.model.js";
import { toPublicProfile } from "@/serializers/profile.serializer.js";

export function toBlock(doc: BlockDoc): Block {
  return {
    id: String(doc._id),
    blockerId: String(doc.blockerId),
    blockedUserId: String(doc.blockedUserId),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

/**
 * A block plus who it is about.
 *
 * The blocked list has to show a name, and a blocked user is excluded from
 * `GET /profiles/:id` by definition — so the one screen that must look them up
 * cannot. Embedding the summary is what makes the screen possible AND keeps
 * the exclusion absolute (PLAN #131).
 *
 * `distanceMetres` is deliberately zero: how far away someone you blocked is
 * standing is not information this screen has any business carrying.
 */
export function toBlockedEntry(doc: BlockDoc, user: UserDoc | null): Block & { user: PublicProfile | null } {
  return {
    ...toBlock(doc),
    user: user ? toPublicProfile(user as Parameters<typeof toPublicProfile>[0], 0) : null,
  };
}

export function toReport(doc: ReportDoc): Report {
  return {
    id: String(doc._id),
    reporterId: String(doc.reporterId),
    reportedUserId: String(doc.reportedUserId),
    reason: doc.reason as ReportReason,
    ...(doc.details ? { details: doc.details } : {}),
    alsoBlocked: doc.alsoBlocked ?? false,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}
