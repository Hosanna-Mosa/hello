/**
 * Likes, requests and matches.
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import { toLike, toMatch, toMessageRequest } from "@/serializers/match.serializer.js";
import * as likes from "@/services/likes.service.js";
import { emitMatch, emitRequest, emitThreadEnded } from "@/sockets/emitters.js";
import type { RequestStatus } from "@/services/likes.service.js";

function requireUser(req: Request) {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();
  return user;
}

function paramId(req: Request): string {
  const id = req.params.id;
  if (typeof id !== "string" || !id) throw ApiError.notFound();
  return id;
}

export async function postLike(req: Request, res: Response): Promise<void> {
  const { toUserId, note } = req.body as { toUserId: string; note?: string };
  const result = await likes.sendLike(requireUser(req), toUserId, note);

  if (result.match) {
    // Both sides get the celebration, live.
    emitMatch(result.match.userIds.map(String), toMatch(result.match), null);
  } else if (result.request) {
    // Only the RECIPIENT. There is deliberately no decline event anywhere —
    // A18 is enforced by the absence of a channel.
    emitRequest(String(result.request.toUserId), toMessageRequest(result.request));
  }

  res.json({
    like: toLike(result.like),
    match: result.match ? toMatch(result.match) : null,
  });
}

/** Where you stand with one person — see `connectionWith`. */
export async function getConnection(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId;
  if (typeof userId !== "string" || !userId) throw ApiError.notFound();
  res.json(await likes.connectionWith(requireUser(req), userId));
}

export async function getOutboundLikes(req: Request, res: Response): Promise<void> {
  res.json((await likes.listOutboundLikes(requireUser(req))).map(toLike));
}

export async function getInboundLikes(req: Request, res: Response): Promise<void> {
  res.json((await likes.listInboundLikes(requireUser(req))).map(toLike));
}

export async function getRequests(req: Request, res: Response): Promise<void> {
  const raw = req.query.status;
  const status: RequestStatus =
    raw === "accepted" || raw === "declined" ? raw : "pending";

  res.json((await likes.listRequests(requireUser(req), status)).map(toMessageRequest));
}

export async function postAcceptRequest(req: Request, res: Response): Promise<void> {
  const match = await likes.acceptRequest(requireUser(req), paramId(req));
  emitMatch(match.userIds.map(String), toMatch(match), null);
  res.json(toMatch(match));
}

export async function postDeclineRequest(req: Request, res: Response): Promise<void> {
  await likes.declineRequest(requireUser(req), paramId(req));
  // 204, and nothing else. The sender is never told (A18).
  res.status(204).end();
}

export async function getMatches(req: Request, res: Response): Promise<void> {
  res.json((await likes.listMatches(requireUser(req))).map(toMatch));
}

export async function deleteMatch(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const matchId = paramId(req);

  // Captured BEFORE the unmatch: it clears `threadId` and we still have to
  // tell the other device which thread just disappeared.
  const before = (await likes.listMatches(viewer)).find((m) => String(m._id) === matchId);
  const userIds = before ? before.userIds.map(String) : [];
  const threadId = before?.threadId ? String(before.threadId) : null;

  await likes.unmatch(viewer, matchId);

  if (threadId) emitThreadEnded(userIds, threadId, matchId);

  res.status(204).end();
}
