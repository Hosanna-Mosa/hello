/**
 * Blocks and reports.
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import { toBlock, toBlockedEntry, toReport } from "@/serializers/safety.serializer.js";
import * as safety from "@/services/safety.service.js";
import { emitThreadEnded } from "@/sockets/emitters.js";
import type { ReportReason } from "@/types/wire.js";

function requireUser(req: Request) {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();
  return user;
}

/**
 * Tell both sides their conversation is gone.
 *
 * Shared by both paths that can block, because a report that also blocks must
 * produce exactly the same socket traffic as a plain block. It did not: the
 * emit lived only in `postBlock`, so reporting-and-blocking left the reported
 * person sitting in a live thread room for a thread that had been deleted
 * (PLAN #133).
 */
function announceTeardown(severed: safety.BlockResult["severed"] | null): void {
  if (!severed?.threadId || !severed.matchId) return;
  emitThreadEnded(severed.userIds, severed.threadId, severed.matchId);
}

export async function postBlock(req: Request, res: Response): Promise<void> {
  const { userId } = req.body as { userId: string };
  const { block, severed } = await safety.block(requireUser(req), userId);

  // Both sides, in the same request. A blocked person left sitting in a live
  // thread room is exactly the gap the phase exists to close — and the blocker
  // needs it too, so their own open thread screen closes.
  announceTeardown(severed);

  res.json(toBlock(block));
}

export async function deleteBlock(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId;
  if (typeof userId !== "string" || !userId) throw ApiError.notFound();

  await safety.unblock(requireUser(req), userId);
  res.status(204).end();
}

export async function getBlocks(req: Request, res: Response): Promise<void> {
  const rows = await safety.listBlocked(requireUser(req));
  res.json(rows.map(({ block, user }) => toBlockedEntry(block, user)));
}

export async function postReport(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    reportedUserId: string;
    reason: ReportReason;
    details?: string;
    alsoBlock: boolean;
  };

  const { report: filed, severed } = await safety.report(requireUser(req), {
    reportedUserId: body.reportedUserId,
    reason: body.reason,
    ...(body.details ? { details: body.details } : {}),
    alsoBlock: body.alsoBlock,
  });

  // The teardown IS announced — a deleted thread has to close on both phones.
  // The REPORT is not: the reported person is never told they were reported,
  // and `thread:ended` is indistinguishable from an ordinary unmatch, which is
  // exactly why it is safe to send.
  announceTeardown(severed);

  res.json(toReport(filed));
}
