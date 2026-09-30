/**
 * Support request shapes — for the app's routes, the admin's routes and both
 * sockets. The socket handlers parse with the same schemas, so a socket is not
 * a way around a length limit.
 */

import { z } from "zod";

import { SUPPORT_MESSAGE_MAX } from "@/models/supportMessage.model.js";
import { SUBJECT_MAX, SUPPORT_CATEGORIES, SUPPORT_STATUSES } from "@/models/supportTicket.model.js";

const clientMessageId = z.string().trim().min(1).max(64).optional();
const body = z.string().trim().min(1, "Message cannot be empty.").max(SUPPORT_MESSAGE_MAX);

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3, "Give the ticket a short subject.").max(SUBJECT_MAX),
  category: z.enum(SUPPORT_CATEGORIES),
  message: body,
  clientMessageId,
});

export const supportMessageSchema = z.object({ body, clientMessageId });

export const resolutionResponseSchema = z.object({ accept: z.boolean() });

/** The socket payloads carry the ticket id in the body rather than the path. */
export const socketSendSchema = supportMessageSchema.extend({ ticketId: z.string().min(1).max(64) });
export const socketTicketSchema = z.object({ ticketId: z.string().min(1).max(64) });
export const socketTypingSchema = socketTicketSchema.extend({ isTyping: z.boolean() });

export const adminTicketListQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(SUPPORT_STATUSES).optional(),
  search: z.string().trim().max(60).optional(),
});

export type CreateTicketBody = z.infer<typeof createTicketSchema>;
export type SupportMessageBody = z.infer<typeof supportMessageSchema>;
