/**
 * Threads and messages.
 */

import type { Request, Response } from "express";

import { voiceLog } from "@/config/callLog.js";
import { ApiError } from "@/errors/ApiError.js";
import { toMessage, toThread } from "@/serializers/thread.serializer.js";
import * as threads from "@/services/threads.service.js";
import { removeVoiceFile, saveVoice, voicePath } from "@/services/voice.service.js";
import { emitMessage, emitReaction, emitReceipt } from "@/sockets/emitters.js";
import { voiceQuerySchema } from "@/validators/threads.validator.js";

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

export async function getThreads(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const rows = await threads.listThreads(viewer);
  res.json(rows.map((t) => toThread(t, String(viewer._id))));
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

  const page = await threads.listMessages(viewer, paramId(req), cursor);

  res.json({
    items: page.items.map((m) => toMessage(m, page.thread, String(viewer._id))),
    nextCursor: page.nextCursor,
  });
}

export async function postMessage(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const { body, clientMessageId } = req.body as { body: string; clientMessageId?: string };

  const sent = await threads.sendMessage(viewer, paramId(req), body, clientMessageId);
  const wire = toMessage(sent.message, sent.thread, String(viewer._id));

  // The REST path emits too, so a client on the socket sees a message sent
  // over HTTP. One rule, two doors.
  emitMessage((sent.thread.participantIds ?? []).map(String), String(sent.thread._id), wire);

  res.json(wire);
}

/**
 * A voice message. The body is the raw audio (`express.raw`); the duration and
 * the idempotency key ride in the query string, because there is no JSON body
 * to carry them.
 */
export async function postVoice(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const threadId = paramId(req);

  const viewerId = String(viewer._id);
  const bytes = Buffer.isBuffer(req.body) ? req.body.length : 0;
  voiceLog.info(
    {
      threadId,
      senderId: viewerId,
      bytes,
      contentType: req.header("content-type"),
      durationSec: req.query.durationSec,
    },
    "[voice] upload received",
  );

  const parsed = voiceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    voiceLog.warn({ threadId, senderId: viewerId, query: req.query }, "[voice] upload REFUSED — bad duration/id");
    throw ApiError.validation("Invalid voice message.");
  }
  const { durationSec, clientMessageId } = parsed.data;

  // Membership BEFORE touching the disk: a stranger must not be able to make
  // this server store anything.
  await threads.getThread(viewer, threadId);

  const audio = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  let stored: Awaited<ReturnType<typeof saveVoice>>;
  try {
    stored = await saveVoice(threadId, audio);
  } catch (e) {
    // "Unsupported audio format" here = the bytes were not an MP4/M4A; an
    // EACCES/ENOENT = VOICE_DIR is not writable (deploy README §18).
    voiceLog.warn(
      { threadId, senderId: viewerId, bytes: audio.length, head: audio.subarray(0, 12).toString("hex"), err: (e as Error).message },
      "[voice] upload REFUSED at storage",
    );
    throw e;
  }

  let sent: threads.SentMessage;
  try {
    const result = await threads.sendVoiceMessage(
      viewer,
      threadId,
      { ...stored, durationSec },
      clientMessageId,
    );
    // A retried upload: the original message already owns a file.
    if (result.duplicate) await removeVoiceFile(stored.file);
    sent = result.sent;
  } catch (e) {
    await removeVoiceFile(stored.file);
    voiceLog.warn({ threadId, senderId: viewerId, err: (e as Error).message }, "[voice] message create FAILED — file removed");
    throw e;
  }

  const wire = toMessage(sent.message, sent.thread, String(viewer._id));
  voiceLog.info(
    { threadId, senderId: viewerId, messageId: wire.id, bytes: stored.bytes, durationSec, file: stored.file },
    "[voice] stored and sent to both participants",
  );
  emitMessage((sent.thread.participantIds ?? []).map(String), String(sent.thread._id), wire);
  res.json(wire);
}

/**
 * Streams a voice message's audio to someone in its conversation.
 *
 * `sendFile` answers Range requests, which is what lets the player seek and
 * start before the whole clip has downloaded.
 */
export async function getVoice(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  let message: Awaited<ReturnType<typeof threads.getVoiceMessage>>;
  try {
    message = await threads.getVoiceMessage(viewer, paramId(req));
  } catch (e) {
    voiceLog.warn({ messageId: req.params.id, viewerId: String(viewer._id) }, "[voice] play REFUSED — not found / not in this chat");
    throw e;
  }
  const voice = message.voice!;
  voiceLog.info(
    { messageId: String(message._id), viewerId: String(viewer._id), range: req.header("range") ?? "none", bytes: voice.bytes },
    "[voice] play request",
  );

  await new Promise<void>((done, fail) => {
    res.sendFile(
      voicePath(voice.file),
      {
        // `send` ignores dot-folders by default. The path is ours and already
        // confined to VOICE_DIR, so a dot anywhere in it is not a concern.
        dotfiles: "allow",
        headers: {
          "Content-Type": voice.mime,
          // Personal audio: never in a shared cache.
          "Cache-Control": "private, max-age=86400",
        },
      },
      (err) => {
        if (!err) return done();
        const { code, status } = err as { code?: string; status?: number };
        if (code === "ENOENT" || status === 404) {
          voiceLog.warn({ messageId: String(message._id), file: voice.file }, "[voice] play FAILED — file missing on disk");
          return fail(ApiError.notFound());
        }
        // The client hung up mid-stream; nothing left to answer.
        if (res.headersSent) return done();
        fail(err);
      },
    );
  });
}

export async function postReaction(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const { emoji } = req.body as { emoji: string };

  const result = await threads.toggleReaction(viewer, paramId(req), emoji);
  const wire = toMessage(result.message, result.thread, String(viewer._id));

  emitReaction((result.thread.participantIds ?? []).map(String), String(result.thread._id), wire);

  res.json(wire);
}

export async function postRead(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const thread = await threads.markRead(viewer, paramId(req));

  const viewerId = String(viewer._id);
  const other = (thread.participantIds ?? []).map(String).find((id) => id !== viewerId);

  // One receipt for the whole cursor move, not one per message read.
  if (other) emitReceipt(other, String(thread._id), { userId: viewerId, readAt: new Date().toISOString() });

  res.status(204).end();
}

export async function patchThread(req: Request, res: Response): Promise<void> {
  const viewer = requireUser(req);
  const { muted } = req.body as { muted: boolean };

  const thread = await threads.setMuted(viewer, paramId(req), muted);
  res.json(toThread(thread, String(viewer._id)));
}
