/**
 * Support tickets, the app's side.
 *
 * Guards per route, not `router.use()` — this mounts at `/v1`, and a blanket
 * guard would turn every unknown path into a 401 instead of a 404.
 *
 * Signed-in is enough; onboarding is not required. Someone stuck halfway
 * through setting up an account is exactly who might need help.
 */

import { Router } from "express";

import * as controller from "@/controllers/support.controller.js";
import { requireAuth } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import { createTicketSchema, resolutionResponseSchema, supportMessageSchema } from "@/validators/support.validator.js";

export const supportRouter: Router = Router();

supportRouter.get("/support/tickets", requireAuth, controller.getTickets);
supportRouter.post(
  "/support/tickets",
  requireAuth,
  rateLimit("support-create"),
  validateBody(createTicketSchema),
  controller.postTicket,
);
supportRouter.get("/support/tickets/:id", requireAuth, controller.getTicket);
supportRouter.post(
  "/support/tickets/:id/messages",
  requireAuth,
  rateLimit("message-send"),
  validateBody(supportMessageSchema),
  controller.postMessage,
);
supportRouter.post("/support/tickets/:id/read", requireAuth, controller.postRead);
supportRouter.post(
  "/support/tickets/:id/resolution",
  requireAuth,
  validateBody(resolutionResponseSchema),
  controller.postResolution,
);
