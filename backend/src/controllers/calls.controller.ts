/**
 * Calls over REST.
 *
 * The socket path is how a call RINGS; these exist so a call can still be
 * started, ended and listed without a live connection — and so the call log
 * survives a socket that was never connected.
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import { MessageModel } from "@/models/message.model.js";
import { toCall } from "@/serializers/call.serializer.js";
import { toMessage } from "@/serializers/thread.serializer.js";
import * as calls from "@/services/calls.service.js";
import { emitCallEnded, emitIncomingCall } from "@/sockets/emitters.js";
import { iceServersFor } from "@/services/ice.service.js";

function requireUser(req: Request) {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();
  return user;
}

export async function postCall(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const { threadId } = req.body as { threadId: string };

  const started = await calls.startCall(viewer, threadId);
  const viewerId = String(viewer._id);

  emitIncomingCall(started.calleeId, {
    call: toCall(started.call, started.calleeId),
    fromUserId: viewerId,
  });

  res.json(toCall(started.call, viewerId));
}

export async function postEndCall(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const id = req.params.id;
  if (typeof id !== "string" || !id) throw ApiError.notFound();

  const { outcome, durationSec } = req.body as { outcome: calls.CallOutcome; durationSec?: number };
  const ended = await calls.endCall(viewer, id, outcome, durationSec ?? 0);
  const viewerId = String(viewer._id);

  let systemMessage = null;
  if (ended.systemMessageId) {
    const doc = await MessageModel.findById(ended.systemMessageId);
    if (doc) systemMessage = toMessage(doc, ended.thread, viewerId);
  }

  for (const participant of (ended.thread.participantIds ?? []).map(String)) {
    emitCallEnded([participant], {
      call: toCall(ended.call, participant),
      ...(systemMessage ? { systemMessage } : {}),
    });
  }

  res.json(toCall(ended.call, viewerId));
}

/**
 * The ICE servers this caller should use, with a TURN credential that expires.
 *
 * Fetched per call rather than baked into the app: the credential is
 * short-lived by design, and a build that shipped one would be handing out an
 * open relay (see `ice.service.ts`).
 */
export async function getIceServers(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  res.json({ iceServers: iceServersFor(String(user._id)) });
}

export async function getCalls(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const threadId = typeof req.query.threadId === "string" ? req.query.threadId : undefined;

  const rows = await calls.listCalls(viewer, threadId);
  res.json(rows.map((c) => toCall(c, String(viewer._id))));
}
