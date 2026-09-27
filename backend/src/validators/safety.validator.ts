import { z } from "zod";

import { REPORT_REASONS } from "@/models/report.model.js";

export const blockSchema = z
  .object({
    userId: z.string().min(1).max(64),
  })
  .strict();

export const reportSchema = z
  .object({
    reportedUserId: z.string().min(1).max(64),
    // The same seven the app offers and the model stores. Anything else is a
    // client that has drifted from the contract, and is rejected rather than
    // filed as "other" — a misfiled report is worse than a refused one.
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().min(1).max(1000).optional(),
    /** Reporting optionally blocks too. Explicit, never inferred. */
    alsoBlock: z.boolean().default(false),
  })
  .strict();
