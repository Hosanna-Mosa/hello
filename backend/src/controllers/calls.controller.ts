/**
 * Calls over REST.
 *
 * The socket path is how a call RINGS; these exist so a call can still be
 * started, ended and listed without a live connection — and so the call log
 * survives a socket that was never connected.
 */

import type { Request, Response } from "express";

import { callLog } from "@/config/callLog.js";
import { ApiError } from "@/errors/ApiError.js";
import { MessageModel } from "@/models/message.model.js";
import { toCall } from "@/serializers/call.serializer.js";
import { toMessage } from "@/serializers/thread.serializer.js";
import * as calls from "@/services/calls.service.js";
import { emitCallEnded, emitIncomingCall } from "@/sockets/emitters.js";
import { socketsOnline } from "@/sockets/presence.js";
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

  const wire = toCall(started.call, viewerId);
  callLog.info(
    {
      callId: wire.id,
      threadId,
      callerId: viewerId,
      calleeId: started.calleeId,
      calleeSockets: await socketsOnline(started.calleeId),
    },
    "[call] started — ring sent to callee (calleeSockets 0 = nobody to ring)",
  );

  res.json(wire);
}

export async function postEndCall(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const id = req.params.id;
  if (typeof id !== "string" || !id) throw ApiError.notFound();

  const { outcome, durationSec } = req.body as { outcome: calls.CallOutcome; durationSec?: number };
  const ended = await calls.endCall(viewer, id, outcome, durationSec ?? 0);
  const viewerId = String(viewer._id);

  callLog.info(
    {
      callId: id,
      endedBy: viewerId,
      requestedOutcome: outcome,
      outcome: ended.call.outcome,
      durationSec: ended.call.durationSec,
      answered: Boolean(ended.call.answeredAt),
    },
    "[call] ended",
  );

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
  const iceServers = iceServersFor(String(user._id));

  // Types only — never the credential. `turn: false` here means this phone
  // cannot use a relay, and calls over most mobile networks will not connect.
  callLog.info(
    {
      userId: String(user._id),
      stun: iceServers.filter((s) => !s.username).flatMap((s) => s.urls).length,
      turn: iceServers.some((s) => Boolean(s.username)),
      turnUrls: iceServers.filter((s) => s.username).flatMap((s) => s.urls),
    },
    "[call] ice servers handed out",
  );

  res.json({ iceServers });
}

export async function getCalls(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const threadId = typeof req.query.threadId === "string" ? req.query.threadId : undefined;

  const rows = await calls.listCalls(viewer, threadId);
  res.json(rows.map((c) => toCall(c, String(viewer._id))));
}
