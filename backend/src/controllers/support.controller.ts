/**
 * Support tickets, the app's side. HTTP in, service out, serializer back — and
 * every write is announced over the socket to the user's devices and to every
 * connected operator.
 */

import type { Request, Response } from "express";

import { ApiError } from "@/errors/ApiError.js";
import { toSupportMessage, toSupportTicket } from "@/serializers/support.serializer.js";
import * as support from "@/services/support.service.js";
import { emitSupportUpdate } from "@/sockets/emitters.js";
import type { SupportTicketDetail } from "@/types/wire.js";
import type { CreateTicketBody, SupportMessageBody } from "@/validators/support.validator.js";

function requireUser(req: Request) {
  const user = req.user;
  if (!user) throw ApiError.unauthorized();
  return user;
}

function ticketId(req: Request): string {
  const id = req.params.id;
  if (typeof id !== "string" || !id) throw ApiError.notFound("That ticket doesn't exist.");
  return id;
}

const detail = (result: support.SupportResult): SupportTicketDetail => ({
  ticket: toSupportTicket(result.ticket),
  messages: result.messages.map(toSupportMessage),
});

/** Send the response, then tell everyone else. */
function announce(req: Request, result: support.SupportResult): void {
  emitSupportUpdate(result.ticket, result.messages, support.summaryOfUser(requireUser(req)));
}

export async function getTickets(req: Request, res: Response): Promise<void> {
  const tickets = await support.listUserTickets(requireUser(req));
  res.json(tickets.map(toSupportTicket));
}

export async function postTicket(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateTicketBody;
  const result = await support.createTicket(requireUser(req), body);
  res.status(201).json(detail(result));
  announce(req, result);
}

export async function getTicket(req: Request, res: Response): Promise<void> {
  const result = await support.openUserTicket(requireUser(req), ticketId(req));
  res.json(detail(result));
}

export async function postMessage(req: Request, res: Response): Promise<void> {
  const { body, clientMessageId } = req.body as SupportMessageBody;
  const result = await support.sendUserMessage(requireUser(req), ticketId(req), body, clientMessageId);
  res.json(detail(result));
  announce(req, result);
}

export async function postRead(req: Request, res: Response): Promise<void> {
  const ticket = await support.markReadByUser(requireUser(req), ticketId(req));
  res.json(toSupportTicket(ticket));
}

export async function postResolution(req: Request, res: Response): Promise<void> {
  const { accept } = req.body as { accept: boolean };
  const result = await support.respondToResolution(requireUser(req), ticketId(req), accept);
  res.json(detail(result));
  if (result.messages.length > 0) announce(req, result);
}
