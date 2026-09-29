import { z } from "zod";

import { env } from "@/config/env.js";

export const sendMessageSchema = z
  .object({
    body: z.string().trim().min(1, "Message cannot be empty").max(2000),
    /**
     * Makes a send idempotent. A phone that retries a request whose response it
     * never saw gets the original message back rather than posting twice.
     */
    clientMessageId: z.string().min(1).max(64).optional(),
  })
  .strict();

/** The query string of `POST /threads/:id/voice` — the body is the audio. */
export const voiceQuerySchema = z.object({
  durationSec: z.coerce.number().min(0.5, "Too short").max(env.VOICE_MAX_SEC, "Too long"),
  clientMessageId: z.string().min(1).max(64).optional(),
});

export const reactionSchema = z
  .object({
    // One grapheme, not one code unit: an emoji is routinely several code
    // points, and `.length` on a string would reject most of them.
    emoji: z.string().trim().min(1).max(8),
  })
  .strict();

export const patchThreadSchema = z.object({ muted: z.boolean() }).strict();
