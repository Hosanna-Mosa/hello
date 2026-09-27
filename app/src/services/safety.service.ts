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

import { currentUserIdOrMe, http, isMockMode, nextId, nowIso, request } from "./client";
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
    if (!isMockMode()) {
      // The server also ends any match, deletes the conversation and drops the
      // likes — blocking is a teardown, not a filter — and tells both sockets.
      return http<Block>("POST", "/blocks", { userId });
    }

    return request(() => {
      const existing = blocks.find((b) => b.blockedUserId === userId);
      if (existing) return { ...existing };

      const block: Block = {
        id: nextId("block"),
        blockerId: currentUserIdOrMe(),
        blockedUserId: userId,
        createdAt: nowIso(),
      };
      blocks = [...blocks, block];
      return { ...block };
    });
  },

  async unblock(userId: string): Promise<void> {
    if (!isMockMode()) {
      // Undoes only YOUR block. If they also blocked you, that one stands.
      return http<void>("DELETE", `/blocks/${encodeURIComponent(userId)}`);
    }

    return request(() => {
      blocks = blocks.filter((b) => b.blockedUserId !== userId);
    });
  },

  async listBlocked(): Promise<Block[]> {
    // Each row carries the blocked person's summary, because no other endpoint
    // will return it — see `Block.user`.
    if (!isMockMode()) return http<Block[]>("GET", "/blocks");

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
      reporterId: currentUserIdOrMe(),
      reportedUserId,
      reason,
      details,
      alsoBlocked: alsoBlock,
      createdAt: nowIso(),
    };

    if (!isMockMode()) {
      // `alsoBlock` is handled SERVER-side, in the same request, so the
      // evidence snapshot is taken before the block deletes the conversation.
      // Blocking again from here would be a second, redundant teardown.
      return http<Report>("POST", "/reports", {
        reportedUserId,
        reason,
        ...(details ? { details } : {}),
        alsoBlock,
      });
    }

    if (alsoBlock) await safetyService.block(reportedUserId);

    return request(() => {
      reports = [...reports, report];
      return { ...report };
    });
  },

  async listReports(): Promise<Report[]> {
    return request(() => reports.map((r) => ({ ...r })));
  },

  /**
   * Synchronous, for other services filtering their own results.
   *
   * MOCK ONLY, and every caller is already inside an `isMockMode()` branch.
   * Against the real API the server excludes blocked people from discovery,
   * search, likes, requests and chat before they are ever sent, so there is
   * nothing left here to filter.
   */
  blockedIdsSync(): Set<string> {
    return new Set(blocks.map((b) => b.blockedUserId));
  },

  __reset(): void {
    blocks = [];
    reports = [];
  },
};
