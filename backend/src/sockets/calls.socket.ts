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
 */

import { logger } from "@/config/logger.js";
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

type Ack = (result: unknown) => void;
const fail = (code: string, message: string) => ({ error: { code, message } });

export function registerCallHandlers(socket: AppSocket): void {
  const user = socket.user;
  if (!user) return;
  const userId = String(user._id);

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
    } catch (e) {
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
    try {
      const call = await calls.acceptCall(user, String(payload?.callId ?? ""));

      ack?.({ call: toCall(call, userId) });
      // To the CALLER — they are the one on a ringing screen.
      emitCallAccepted(String(call.callerId), String(call._id));
    } catch (e) {
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
      if (kind !== "offer" && kind !== "answer" && kind !== "ice") {
        ack?.(fail("validation", "Unknown signal kind."));
        return;
      }

      try {
        const { call, otherId } = await calls.participantsOf(user, String(payload?.callId ?? ""));

        emitCallSignal(otherId, {
          callId: String(call._id),
          kind,
          data: payload?.data,
          fromUserId: userId,
        });

        ack?.({ ok: true });
      } catch (e) {
        logger.warn({ err: e, userId }, "call signal refused");
        ack?.(fail((e as { code?: string }).code ?? "server", (e as Error).message));
      }
    },
  );

  socket.on(
    "call:end",
    async (payload: { callId?: string; outcome?: calls.CallOutcome; durationSec?: number }, ack?: Ack) => {
      try {
        const ended = await calls.endCall(
          user,
          String(payload?.callId ?? ""),
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
      } catch (e) {
        logger.warn({ err: e, userId }, "socket call end failed");
        ack?.(fail((e as { code?: string }).code ?? "server", (e as Error).message));
      }
    },
  );
}
