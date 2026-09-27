import { z } from "zod";

export const startCallSchema = z.object({ threadId: z.string().min(1).max(64) }).strict();

export const endCallSchema = z
  .object({
    outcome: z.enum(["completed", "missed", "declined", "cancelled"]),
    /** Zero unless the call was answered. Capped at 6 hours. */
    durationSec: z.coerce.number().int().min(0).max(21_600).optional(),
  })
  .strict();
