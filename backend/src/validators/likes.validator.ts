import { z } from "zod";

export const likeSchema = z
  .object({
    toUserId: z.string().min(1).max(64),
    /** A note turns the like into a message request. Absent = a silent like. */
    note: z.string().trim().min(1).max(300).optional(),
  })
  .strict();
