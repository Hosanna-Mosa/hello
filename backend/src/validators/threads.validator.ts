import { z } from "zod";

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

export const reactionSchema = z
  .object({
    // One grapheme, not one code unit: an emoji is routinely several code
    // points, and `.length` on a string would reject most of them.
    emoji: z.string().trim().min(1).max(8),
  })
  .strict();

export const patchThreadSchema = z.object({ muted: z.boolean() }).strict();
