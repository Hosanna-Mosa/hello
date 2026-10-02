/**
 * Buying premium. The Razorpay webhook is NOT here: it needs the raw body for
 * its signature, so it is mounted in app.ts before the JSON parser.
 */

import { Router } from "express";

import * as controller from "@/controllers/billing.controller.js";
import { requireAuth } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import { createOrderSchema } from "@/validators/billing.validator.js";

export const billingRouter: Router = Router();

const guarded = [requireAuth, rateLimit("api-user", "user")];

billingRouter.post(
  "/billing/orders",
  guarded,
  rateLimit("billing-order", "user"),
  validateBody(createOrderSchema),
  controller.postOrder,
);
billingRouter.get("/billing/orders/:id", guarded, controller.getOrder);
