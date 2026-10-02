import { z } from "zod";

/** Only the plan. The price comes from the server's plan row, never the client. */
export const createOrderSchema = z.object({ planId: z.string().min(1).max(40) }).strict();

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
