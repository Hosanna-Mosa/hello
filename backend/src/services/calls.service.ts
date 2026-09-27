/**
 * Voice calls. Mocked end to end (PLAN A17) — no audio, no mic, no WebRTC.
 *
 * The RECORD is real, because that is what the product actually shows: a
 * "Voice call · 2:14" line in the thread, and a missed-call entry. When real
 * call infrastructure lands, only the media changes; this shape does not.
 *
 * A completed call with a non-zero duration appends a SYSTEM message. Missed,
 * declined and cancelled calls do not — a thread littered with "you tried to
 * call" is noise, and the contract says so explicitly.
 */

import { Types } from "mongoose";

import { ApiError } from "@/errors/ApiError.js";
import { CallModel, type CallDoc } from "@/models/call.model.js";
import { MessageModel } from "@/models/message.model.js";
import type { ThreadDoc } from "@/models/thread.model.js";
import type { UserDoc } from "@/models/user.model.js";
import * as threads from "@/services/threads.service.js";
import { withTransaction } from "@/utils/transaction.js";

export type CallOutcome = "completed" | "missed" | "declined" | "cancelled";

/** `2:14` — minutes and zero-padded seconds, matching the app's formatter. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export type StartedCall = { call: CallDoc; thread: ThreadDoc; calleeId: string };

export async function startCall(viewer: UserDoc, threadId: string): Promise<StartedCall> {
  const thread = await threads.getThread(viewer, threadId);

  const calleeId = (thread.participantIds ?? []).map(String).find((id) => id !== String(viewer._id));
  if (!calleeId) throw ApiError.validation("There is nobody to call.");

  const [call] = await CallModel.create([
    {
      threadId: thread._id,
      callerId: viewer._id,
      calleeId: new Types.ObjectId(calleeId),
      startedAt: new Date(),
    },
  ]);

  return { call: call!, thread, calleeId };
}

/**
 * The callee picked up.
 *
 * Stamps `answeredAt`, which nothing set before — the app faked the connected
 * state after a 2.2s timer, so the field existed and stayed null on every call
 * ever made. It is what separates a `completed` call from a `missed` one, and
 * what the duration is measured from.
 *
 * Only the CALLEE may accept, and only once: a second accept is a no-op rather
 * than an error, because a flaky network retrying the emit must not fail.
 */
export async function acceptCall(viewer: UserDoc, callId: string): Promise<CallDoc> {
  if (!Types.ObjectId.isValid(callId)) throw ApiError.notFound();

  const call = await CallModel.findById(callId);
  if (!call) throw ApiError.notFound();

  // notFound, not forbidden: a caller probing ids must not learn one exists.
  if (String(call.calleeId) !== String(viewer._id)) throw ApiError.notFound();
  if (call.endedAt) throw ApiError.validation("That call has already ended.");

  if (!call.answeredAt) {
    call.answeredAt = new Date();
    await call.save();
  }

  return call;
}

/**
 * The two people on a call, for relaying signalling between them.
 *
 * Throws `notFound` for anyone else and for a call that is over, so an
 * offer/answer/ICE message cannot be relayed into a finished call or to a
 * third party who guessed an id.
 */
export async function participantsOf(
  viewer: UserDoc,
  callId: string,
): Promise<{ call: CallDoc; otherId: string }> {
  if (!Types.ObjectId.isValid(callId)) throw ApiError.notFound();

  const call = await CallModel.findById(callId);
  if (!call) throw ApiError.notFound();
  if (call.endedAt) throw ApiError.notFound();

  const me = String(viewer._id);
  const caller = String(call.callerId);
  const callee = String(call.calleeId);
  if (me !== caller && me !== callee) throw ApiError.notFound();

  return { call, otherId: me === caller ? callee : caller };
}

export type EndedCall = { call: CallDoc; thread: ThreadDoc; systemMessageId: string | null };

export async function endCall(
  viewer: UserDoc,
  callId: string,
  outcome: CallOutcome,
  durationSec: number,
): Promise<EndedCall> {
  if (!Types.ObjectId.isValid(callId)) throw ApiError.notFound();

  return withTransaction(async (session) => {
    const opts = session ? { session } : {};

    const call = await CallModel.findById(callId, null, opts);
    if (!call) throw ApiError.notFound();

    // Either party may end it, but nobody else.
    const isParticipant = [String(call.callerId), String(call.calleeId)].includes(String(viewer._id));
    if (!isParticipant) throw ApiError.notFound();

    // Ending twice must not append a second system message.
    if (call.endedAt) {
      const thread = await threads.getThread(viewer, String(call.threadId));
      return { call, thread, systemMessageId: null };
    }

    call.endedAt = new Date();
    call.outcome = outcome;
    call.durationSec = Math.max(0, Math.floor(durationSec));
    if (outcome === "completed" && !call.answeredAt) call.answeredAt = call.startedAt;
    await call.save(opts);

    const thread = await threads.getThread(viewer, String(call.threadId));
    let systemMessageId: string | null = null;

    // Only a connected call leaves a trace in the conversation.
    if (outcome === "completed" && call.durationSec > 0) {
      const now = new Date();
      const [message] = await MessageModel.create(
        [
          {
            threadId: thread._id,
            senderId: call.callerId,
            kind: "system",
            body: `Voice call · ${formatDuration(call.durationSec)}`,
            systemMeta: { type: "callRecord", callId: String(call._id), durationSec: call.durationSec },
            createdAt: now,
          },
        ],
        opts,
      );

      if (message) {
        systemMessageId = String(message._id);
        thread.lastMessageAt = now;
        thread.lastMessage = {
          messageId: message._id,
          senderId: call.callerId as Types.ObjectId,
          kind: "system",
          body: message.body,
          createdAt: now,
        };
        await thread.save(opts);
      }
    }

    return { call, thread, systemMessageId };
  });
}

export async function listCalls(viewer: UserDoc, threadId?: string): Promise<CallDoc[]> {
  if (threadId) {
    // Membership check, so a call log cannot be read by id alone.
    await threads.getThread(viewer, threadId);
    return CallModel.find({ threadId }).sort({ startedAt: -1 }).limit(50) as unknown as CallDoc[];
  }

  return CallModel.find({ $or: [{ callerId: viewer._id }, { calleeId: viewer._id }] })
    .sort({ startedAt: -1 })
    .limit(50) as unknown as CallDoc[];
}
