/**
 * Blocking and reporting.
 *
 * A leaf service: it imports nothing else, so `profiles.service` can filter
 * blocked people without a dependency cycle.
 *
 * Blocking is symmetric and immediate. Reporting is fire-and-forget by design —
 * the reporter is never told what happened to the person they reported, which
 * is both standard practice and the safest thing for them.
 */

import { nextId, nowIso, request } from "./client";
import type { Block, Report, ReportReason } from "./types";

let blocks: Block[] = [];
let reports: Report[] = [];

/**
 * "Romantic or flirty advance" leads deliberately. This product is platonic
 * only, and this list is where that is enforced rather than merely claimed.
 */
export const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: "romanticAdvance", label: "Romantic or flirty advance" },
  { reason: "harassment", label: "Harassment or bullying" },
  { reason: "inappropriateContent", label: "Inappropriate content" },
  { reason: "spamOrScam", label: "Spam or scam" },
  { reason: "fakeProfile", label: "Fake profile" },
  { reason: "underage", label: "They appear to be under 18" },
  { reason: "other", label: "Something else" },
];

export const safetyService = {
  async block(userId: string): Promise<Block> {
    return request(() => {
      const existing = blocks.find((b) => b.blockedUserId === userId);
      if (existing) return { ...existing };

      const block: Block = {
        id: nextId("block"),
        blockerId: "me",
        blockedUserId: userId,
        createdAt: nowIso(),
      };
      blocks = [...blocks, block];
      return { ...block };
    });
  },

  async unblock(userId: string): Promise<void> {
    return request(() => {
      blocks = blocks.filter((b) => b.blockedUserId !== userId);
    });
  },

  async listBlocked(): Promise<Block[]> {
    return request(() => blocks.map((b) => ({ ...b })));
  },

  async report(
    reportedUserId: string,
    reason: ReportReason,
    details?: string,
    alsoBlock = false,
  ): Promise<Report> {
    const report: Report = {
      id: nextId("report"),
      reporterId: "me",
      reportedUserId,
      reason,
      details,
      alsoBlocked: alsoBlock,
      createdAt: nowIso(),
    };

    if (alsoBlock) await safetyService.block(reportedUserId);

    return request(() => {
      reports = [...reports, report];
      return { ...report };
    });
  },

  async listReports(): Promise<Report[]> {
    return request(() => reports.map((r) => ({ ...r })));
  },

  /** Synchronous, for other services filtering their own results. */
  blockedIdsSync(): Set<string> {
    return new Set(blocks.map((b) => b.blockedUserId));
  },

  __reset(): void {
    blocks = [];
    reports = [];
  },
};
