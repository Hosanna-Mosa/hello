/**
 * Threads and messages.
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import { toMessage, toThread } from "@/serializers/thread.serializer.js";
import * as threads from "@/services/threads.service.js";
import { emitMessage, emitReaction, emitReceipt } from "@/sockets/emitters.js";

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
