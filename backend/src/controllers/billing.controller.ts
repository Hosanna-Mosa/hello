/**
 * Billing controllers. The webhook is the only unauthenticated route that can
 * change an account — which is exactly why it does nothing until the
 * signature over the raw body checks out.
 */

import type { Request, Response } from "express";

import { logger } from "@/config/logger.js";
import { ApiError } from "@/errors/ApiError.js";
import type { PaymentOrderDoc } from "@/models/paymentOrder.model.js";
import { UserModel } from "@/models/user.model.js";
import * as billing from "@/services/billing.service.js";
import { verifyWebhookSignature } from "@/services/razorpay.service.js";
import { isPremiumNow } from "@/utils/entitlements.js";
import type { CreateOrderBody } from "@/validators/billing.validator.js";

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

const toOrder = (o: PaymentOrderDoc) => ({
  id: String(o._id),
  planId: o.planId,
  amountMinor: o.amountMinor,
  currency: o.currency,
  status: o.status,
  paymentUrl: o.status === "created" ? o.paymentUrl : null,
  grantedUntil: o.grantedUntil ? o.grantedUntil.toISOString() : null,
  createdAt: (o.get("createdAt") as Date).toISOString(),
});

export async function postOrder(req: Request, res: Response): Promise<void> {
  const { planId } = req.body as CreateOrderBody;
  const order = await billing.createOrder(requireUser(req), planId);
  res.status(201).json(toOrder(order));
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const id = typeof req.params.id === "string" ? req.params.id : "";
  const order = await billing.checkOrder(user, id);
  // Re-read the account so a just-granted pass is reflected in this answer.
  const fresh = order.status === "paid" ? await UserModel.findById(user._id) : user;
  res.json({ order: toOrder(order), isPremium: fresh ? isPremiumNow(fresh) : false });
}

/** Mounted with `express.raw` in app.ts — `req.body` is the untouched Buffer. */
export async function postRazorpayWebhook(req: Request, res: Response): Promise<void> {
  const raw = req.body as unknown;
  if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, req.header("x-razorpay-signature"))) {
    logger.warn({ ip: req.ip }, "[billing] webhook REFUSED — bad signature");
    res.status(400).json({ error: { code: "validation", message: "Invalid signature." } });
    return;
  }

  let event: unknown;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    res.status(400).json({ error: { code: "validation", message: "Invalid body." } });
    return;
  }

  await billing.handleWebhook(event as Parameters<typeof billing.handleWebhook>[0]);
  // 200 for anything signed, handled or not — a non-2xx makes Razorpay retry forever.
  res.status(200).json({ ok: true });
}
