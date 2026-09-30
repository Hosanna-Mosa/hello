/**
 * Support tickets, the panel's side. Mounted under `/v1/admin`, so every route
 * already has a live admin session and the CSRF header by the time it lands
 * here (see `admin.routes.ts`).
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import { toAdminSupportMessage, toAdminSupportTicket } from "@/serializers/support.serializer.js";
import { issueSocketTicket } from "@/services/adminAuth.service.js";
import * as support from "@/services/support.service.js";
import { emitSupportUpdate } from "@/sockets/emitters.js";
import { adminTicketListQuery, type SupportMessageBody } from "@/validators/support.validator.js";
import { objectId } from "@/validators/admin.validator.js";

function requireAdmin(req: Request) {
  if (!req.admin || !req.adminJti) throw ApiError.unauthorized();
  return { admin: req.admin, jti: req.adminJti };
}

function ticketId(req: Request): string {
  const parsed = objectId.safeParse(req.params.id);
  if (!parsed.success) throw ApiError.notFound("That ticket doesn't exist.");
  return parsed.data;
}

async function respond(res: Response, result: support.SupportResult): Promise<void> {
  const owner = await support.ownerSummary(result.ticket);
  res.json({
    ticket: toAdminSupportTicket(result.ticket, owner),
    messages: result.messages.map(toAdminSupportMessage),
  });
  if (result.messages.length > 0) emitSupportUpdate(result.ticket, result.messages, owner);
}

/** A one-minute ticket for opening the panel's socket. See `issueSocketTicket`. */
export async function getSocketTicket(req: Request, res: Response): Promise<void> {
  const { admin, jti } = requireAdmin(req);
  res.json(issueSocketTicket(admin, jti));
}

export async function getSummary(_req: Request, res: Response): Promise<void> {
  res.json(await support.supportSummary());
}

export async function getTickets(req: Request, res: Response): Promise<void> {
  const q = adminTicketListQuery.parse(req.query);
  const { items, total, owners } = await support.listTicketsForAdmin(q);
  res.json({
    items: items.map((t) => toAdminSupportTicket(t, owners.get(String(t.userId)) ?? null)),
    total,
    page: q.page,
    limit: q.limit,
    pages: Math.max(1, Math.ceil(total / q.limit)),
  });
}

export async function getTicket(req: Request, res: Response): Promise<void> {
  const { ticket, messages, owner } = await support.openTicketForAdmin(ticketId(req));
  res.json({ ticket: toAdminSupportTicket(ticket, owner), messages: messages.map(toAdminSupportMessage) });
  // Opening clears the team's unread count — every other open panel should see that.
  emitSupportUpdate(ticket, [], owner);
}

export async function postMessage(req: Request, res: Response): Promise<void> {
  const { body, clientMessageId } = req.body as SupportMessageBody;
  await respond(res, await support.sendAdminMessage(requireAdmin(req).admin, ticketId(req), body, clientMessageId));
}

export async function postResolve(req: Request, res: Response): Promise<void> {
  await respond(res, await support.requestResolution(requireAdmin(req).admin, ticketId(req)));
}

export async function postRead(req: Request, res: Response): Promise<void> {
  const ticket = await support.markReadByAdmin(ticketId(req));
  const owner = await support.ownerSummary(ticket);
  res.json(toAdminSupportTicket(ticket, owner));
  emitSupportUpdate(ticket, [], owner);
}
