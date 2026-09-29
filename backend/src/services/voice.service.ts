/**
 * Voice message audio, on local disk.
 *
 * One folder per thread under `VOICE_DIR`, so ending a conversation (unmatch,
 * block) removes its audio in one call. File names are random — nothing about
 * a person or a message is guessable from a path, and the path is never sent
 * to a client anyway: they stream through `GET /v1/messages/:id/voice`, which
 * checks membership first.
 *
 * The upload is SNIFFED, not trusted. The client says `audio/mp4`; the bytes
 * must agree (an MP4/M4A container starts with an `ftyp` box). Anything else is
 * refused — this endpoint stores what people send, so it must not become a way
 * to park arbitrary files on the server.
 */

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { env } from "@/config/env.js";
import { ApiError } from "@/errors/ApiError.js";

/** What every stored clip is served as. Android and iOS both record AAC in MP4. */
export const VOICE_MIME = "audio/mp4";

const root = () => resolve(env.VOICE_DIR);

function isMp4(buffer: Buffer): boolean {
  return buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp";
}

export type StoredVoice = { file: string; mime: string; bytes: number };

export async function saveVoice(threadId: string, buffer: Buffer): Promise<StoredVoice> {
  if (buffer.length === 0) throw ApiError.validation("The recording is empty.");
  if (buffer.length > env.VOICE_MAX_BYTES) throw ApiError.validation("That recording is too long.");
  if (!isMp4(buffer)) throw ApiError.validation("Unsupported audio format.");

  const file = `${threadId}/${randomUUID()}.m4a`;
  const dir = join(root(), threadId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(root(), file), buffer, { flag: "wx" });

  return { file, mime: VOICE_MIME, bytes: buffer.length };
}

/**
 * The absolute path for a stored clip — refusing anything that would resolve
 * outside `VOICE_DIR`. `file` comes from our own database, but a path join is
 * the classic place for one bad row to become a read of `/etc/passwd`.
 */
export function voicePath(file: string): string {
  const full = resolve(root(), file);
  const rel = relative(root(), full);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) throw ApiError.notFound();
  return full;
}

/** Best-effort: a missing file must never fail the request that removes it. */
export async function removeVoiceFile(file: string): Promise<void> {
  try {
    await rm(voicePath(file), { force: true });
  } catch {
    // Already gone, or never written.
  }
}

/** Every clip in a conversation — used when the conversation itself ends. */
export async function removeThreadVoice(threadId: string): Promise<void> {
  if (!/^[a-f0-9]{24}$/i.test(threadId)) return;
  try {
    await rm(join(root(), threadId), { recursive: true, force: true });
  } catch {
    // Nothing to remove.
  }
}
