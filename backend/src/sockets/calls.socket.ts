/**
 * Call signalling.
 *
 * A call here is a ring, an answer, a record — and now the relay that carries
 * WebRTC's offer, answer and ICE candidates between the two people on it. The
 * MEDIA never touches this server: it flows peer-to-peer, or through the TURN
 * relay when a carrier NAT refuses to let it.
 *
 * Ringing a device is the one thing that CANNOT be done over REST: the callee
 * is not asking for anything, so there is no request to answer. That is why
 * calls need the socket at all.
 *
 * LOGGING. Every step is logged with `[call]` and the call id, and the phones
 * report their own side over `call:diag` — so a call that fails on a device
 * can be followed end to end in the server journal (see `config/callLog.ts`).
 */

import { callLog, candidateType } from "@/config/callLog.js";
import { toCall } from "@/serializers/call.serializer.js";
import { toMessage } from "@/serializers/thread.serializer.js";
import { MessageModel } from "@/models/message.model.js";
import * as calls from "@/services/calls.service.js";
import {
  emitCallAccepted,
  emitCallEnded,
  emitCallSignal,
  emitIncomingCall,
} from "@/sockets/emitters.js";
import type { AppSocket } from "@/sockets/io.js";
import { socketsOnline } from "@/sockets/presence.js";

type Ack = (result: unknown) => void;
const fail = (code: string, message: string) => ({ error: { code, message } });

/** A phone's own report of how its side of a call is going. Capped per socket. */
const MAX_DIAG_PER_SOCKET = 400;
const MAX_DIAG_BYTES = 2000;

export function registerCallHandlers(socket: AppSocket): void {
  const user = socket.user;
  if (!user) return;
  const userId = String(user._id);
  let diagCount = 0;

  socket.on("call:invite", async (payload: { threadId?: string }, ack?: Ack) => {
    try {
      const started = await calls.startCall(user, String(payload?.threadId ?? ""));
      const wire = toCall(started.call, userId);

      ack?.({ call: wire });

      // The callee's view of the same call is `incoming`, not `outgoing`.
      emitIncomingCall(started.calleeId, {
        call: toCall(started.call, started.calleeId),
        fromUserId: userId,
      });

      callLog.info(
        {
          callId: wire.id,
          callerId: userId,
          calleeId: started.calleeId,
          calleeSockets: await socketsOnline(started.calleeId),
          via: "socket",
        },
        "[call] started — ring sent to callee (calleeSockets 0 = nobody to ring)",
      );
    } catch (e) {
      callLog.warn({ userId, threadId: payload?.threadId, err: (e as Error).message }, "[call] invite FAILED");
      ack?.(fail((e as { code?: string }).code ?? "server", (e as Error).message));
    }
  });

  /**
   * The callee picked up.
   *
   * This used to pass the CALL id where `emitCallAccepted` wants a USER id, so
   * the event went to a room nobody was in and the caller never learned they
   * had been answered. It went unnoticed because the app faked the connected
   * state on a 2.2s timer regardless (PLAN #161).
   */
  socket.on("call:accept", async (payload: { callId?: string }, ack?: Ack) => {
    const callId = String(payload?.callId ?? "");
    try {
      const call = await calls.acceptCall(user, callId);

      ack?.({ call: toCall(call, userId) });
      // To the CALLER — they are the one on a ringing screen.
      const callerId = String(call.callerId);
      emitCallAccepted(callerId, String(call._id));

      callLog.info(
        { callId, calleeId: userId, callerId, callerSockets: await socketsOnline(callerId) },
        "[call] accepted by callee — told the caller (callerSockets 0 = caller will never hear it)",
      );
    } catch (e) {
      callLog.warn({ callId, userId, err: (e as Error).message }, "[call] accept FAILED");
      ack?.(fail((e as { code?: string }).code ?? "server", (e as Error).message));
    }
  });

  /**
   * One WebRTC signalling message, relayed to the other party.
   *
   * The server does not parse the payload — it is SDP or an ICE candidate and
   * neither is its business. What it DOES enforce is that the sender is on
   * this call and the call is still live, so a guessed id cannot be used to
   * push media negotiation at a stranger.
   */
  socket.on(
    "call:signal",
    async (
      payload: { callId?: string; kind?: "offer" | "answer" | "ice"; data?: unknown },
      ack?: Ack,
    ) => {
      const kind = payload?.kind;
      const callId = String(payload?.callId ?? "");
      if (kind !== "offer" && kind !== "answer" && kind !== "ice") {
        callLog.warn({ callId, userId, kind }, "[call] signal REFUSED — unknown kind");
        ack?.(fail("validation", "Unknown signal kind."));
        return;
      }

      try {
        const { call, otherId } = await calls.participantsOf(user, callId);

        emitCallSignal(otherId, {
          callId: String(call._id),
          kind,
          data: payload?.data,
          fromUserId: userId,
        });

        if (kind === "ice") {
          callLog.info(
            { callId, from: userId, to: otherId, candidate: candidateType(payload?.data) ?? "?" },
            "[call] relayed ice candidate",
          );
        } else {
          callLog.info(
            { callId, from: userId, to: otherId, recipientSockets: await socketsOnline(otherId) },
            `[call] relayed ${kind}`,
          );
        }

        ack?.({ ok: true });
      } catch (e) {
        // Most often: the call already ended, so its signals are refused.
        callLog.warn({ callId, userId, kind, err: (e as Error).message }, "[call] signal REFUSED");
        ack?.(fail((e as { code?: string }).code ?? "server", (e as Error).message));
      }
    },
  );

  /**
   * A phone reporting its own side of a call: microphone opened, offer sent,
   * ICE state changed, route types found, why it gave up. Logged verbatim (it is
   * size-capped and carries no addresses) — this is what shows WHERE a call
   * that "just says Connecting…" actually stopped.
   */
  socket.on("call:diag", (payload: { callId?: unknown; stage?: unknown; detail?: unknown }) => {
    diagCount += 1;
    if (diagCount > MAX_DIAG_PER_SOCKET) return;

    const callId = typeof payload?.callId === "string" ? payload.callId.slice(0, 40) : "?";
    const stage = typeof payload?.stage === "string" ? payload.stage.slice(0, 60) : "?";
    let detail: unknown = payload?.detail;
    try {
      if (JSON.stringify(detail ?? null).length > MAX_DIAG_BYTES) detail = "[too large]";
    } catch {
      detail = "[unserialisable]";
    }

    callLog.info({ callId, userId, stage, detail }, `[call] phone: ${stage}`);
  });

  socket.on(
    "call:end",
    async (payload: { callId?: string; outcome?: calls.CallOutcome; durationSec?: number }, ack?: Ack) => {
      const callId = String(payload?.callId ?? "");
      try {
        const ended = await calls.endCall(
          user,
          callId,
          payload?.outcome ?? "cancelled",
          Number(payload?.durationSec ?? 0),
        );

        const participantIds = (ended.thread.participantIds ?? []).map(String);

        // The system message rides along on the same event, so a client does
        // not have to re-fetch the thread to show "Voice call · 2:14".
        let systemMessage = null;
        if (ended.systemMessageId) {
          const doc = await MessageModel.findById(ended.systemMessageId);
          if (doc) systemMessage = toMessage(doc, ended.thread, userId);
        }

        ack?.({ call: toCall(ended.call, userId) });

        for (const id of participantIds) {
          emitCallEnded([id], {
            call: toCall(ended.call, id),
            ...(systemMessage ? { systemMessage } : {}),
          });
        }

        callLog.info(
          {
            callId,
            endedBy: userId,
            outcome: ended.call.outcome,
            durationSec: ended.call.durationSec,
            answered: Boolean(ended.call.answeredAt),
            via: "socket",
          },
          "[call] ended",
        );
      } catch (e) {
        callLog.warn({ callId, userId, err: (e as Error).message }, "[call] end FAILED");
        ack?.(fail((e as { code?: string }).code ?? "server", (e as Error).message));
      }
    },
  );
}
