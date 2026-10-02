/**
 * Buying premium: order → Razorpay payment link → confirmed payment → premium.
 *
 * Premium is granted ONLY when Razorpay itself says the link is paid, for the
 * amount we asked, in INR — learned either from a webhook whose signature
 * checks out, or from our own authenticated fetch of the link. Nothing the app
 * sends can grant it: the app only ever says "please check order X".
 *
 * Each plan is a prepaid pass, not an auto-renewing subscription. Buying while
 * already premium EXTENDS the current pass from its end date, so nobody loses
 * days they paid for.
 */

import { Types } from "mongoose";

import { logger } from "@/config/logger.js";
import { ApiError } from "@/errors/ApiError.js";
import { PaymentOrderModel, type PaymentOrderDoc } from "@/models/paymentOrder.model.js";
import { PlanModel } from "@/models/plan.model.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import {
  createPaymentLink,
  fetchPaymentLink,
  razorpayConfigured,
  type RazorpayLink,
} from "@/services/razorpay.service.js";
import { isPremiumNow } from "@/utils/entitlements.js";

/** Razorpay requires at least 15 minutes; 30 gives a slow UPI app room. */
const LINK_TTL_MS = 30 * 60 * 1000;

const MONTHS: Record<string, number> = { month: 1, sixMonths: 6, year: 12 };

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function createOrder(user: UserDoc, planId: string): Promise<PaymentOrderDoc> {
  if (!razorpayConfigured()) throw ApiError.validation("Purchases aren't available yet.");

  const plan = await PlanModel.findOne({ _id: planId, active: true });
  if (!plan) throw ApiError.notFound("That plan is not available.");

  // Our row first, so the link can name it and every webhook maps back to it.
  const order = await PaymentOrderModel.create({
    userId: user._id,
    planId: plan._id,
    planLabel: plan.label,
    period: plan.period,
    amountMinor: plan.priceMinor,
    currency: "INR",
  });

  try {
    const link = await createPaymentLink({
      referenceId: String(order._id),
      amountMinor: plan.priceMinor,
      description: `Premium · ${plan.label}`,
      expireBy: new Date(Date.now() + LINK_TTL_MS),
      notes: { orderId: String(order._id), userId: String(user._id), planId: String(plan._id) },
    });
    order.providerLinkId = link.id;
    order.paymentUrl = link.short_url;
    await order.save();
  } catch (e) {
    order.status = "failed";
    await order.save();
    throw e;
  }

  logger.info({ orderId: String(order._id), userId: String(user._id), planId }, "[billing] order created");
  return order;
}

/**
 * Accepts a link Razorpay says is paid — after checking it is OUR link, for
 * the order's amount, in INR. Idempotent: exactly one caller wins the
 * `created → paid` transition and extends the pass.
 */
async function settlePaid(order: PaymentOrderDoc, link: RazorpayLink, via: "webhook" | "poll", paymentId?: string) {
  if (link.id !== order.providerLinkId || link.reference_id !== String(order._id)) {
    logger.error({ orderId: String(order._id), linkId: link.id }, "[billing] link does not belong to this order");
    return;
  }
  if (link.status !== "paid" || link.currency !== "INR" || link.amount_paid !== order.amountMinor) {
    logger.error(
      { orderId: String(order._id), status: link.status, paid: link.amount_paid, expected: order.amountMinor },
      "[billing] link not fully paid at the expected amount — NOT granting",
    );
    return;
  }

  const won = await PaymentOrderModel.findOneAndUpdate(
    { _id: order._id, status: { $ne: "paid" } },
    {
      $set: {
        status: "paid",
        paidAt: new Date(),
        confirmedVia: via,
        providerPaymentId: paymentId ?? link.payments?.find((p) => p.status === "captured")?.payment_id ?? null,
      },
    },
    { new: true },
  );
  if (!won) return; // Someone else already settled it.

  const user = await UserModel.findById(order.userId);
  if (!user || user.status === "erased") {
    logger.error({ orderId: String(order._id) }, "[billing] paid order for a missing or deleted account — refund manually");
    return;
  }

  // Extend from the current end date if the pass is still running.
  const now = new Date();
  const runningUntil = isPremiumNow(user, now) ? user.entitlements.expiresAt : null;
  if (isPremiumNow(user, now) && !runningUntil) {
    // An open-ended admin grant: nothing to extend, but the payment is recorded.
    logger.warn({ orderId: String(order._id) }, "[billing] paid while holding an open-ended grant");
    return;
  }
  const until = addMonths(runningUntil ?? now, MONTHS[order.period] ?? 1);

  await UserModel.updateOne(
    { _id: user._id },
    {
      $set: {
        "entitlements.isPremium": true,
        "entitlements.since": user.entitlements.since && runningUntil ? user.entitlements.since : now,
        "entitlements.expiresAt": until,
        "entitlements.source": "purchase",
      },
    },
  );
  await PaymentOrderModel.updateOne({ _id: order._id }, { $set: { grantedUntil: until } });
  logger.info({ orderId: String(order._id), userId: String(user._id), until, via }, "[billing] premium granted");
}

function settleClosed(order: PaymentOrderDoc, status: "expired" | "cancelled") {
  return PaymentOrderModel.updateOne({ _id: order._id, status: "created" }, { $set: { status } });
}

/**
 * The app asking "has order X gone through?". Only reads the caller's own
 * order, and asks RAZORPAY rather than believing anyone — this is the fallback
 * for a webhook that is late or never arrives.
 */
export async function checkOrder(user: UserDoc, orderId: string): Promise<PaymentOrderDoc> {
  if (!Types.ObjectId.isValid(orderId)) throw ApiError.notFound();
  const order = await PaymentOrderModel.findOne({ _id: orderId, userId: user._id });
  if (!order) throw ApiError.notFound();

  if (order.status === "created" && order.providerLinkId) {
    const link = await fetchPaymentLink(order.providerLinkId);
    if (link.status === "paid") await settlePaid(order, link, "poll");
    else if (link.status === "expired" || link.status === "cancelled") await settleClosed(order, link.status);
  }
  return (await PaymentOrderModel.findById(order._id)) ?? order;
}

type WebhookEvent = {
  event?: string;
  payload?: {
    payment_link?: { entity?: RazorpayLink };
    payment?: { entity?: { id?: string } };
  };
};

/** Called only after the signature has been verified by the controller. */
export async function handleWebhook(event: WebhookEvent): Promise<void> {
  const link = event.payload?.payment_link?.entity;
  if (!link?.id) return; // Not a payment-link event; nothing of ours.

  const order = await PaymentOrderModel.findOne({ providerLinkId: link.id });
  if (!order) {
    logger.warn({ linkId: link.id, event: event.event }, "[billing] webhook for an unknown link");
    return;
  }

  switch (event.event) {
    case "payment_link.paid":
      await settlePaid(order, link, "webhook", event.payload?.payment?.entity?.id);
      break;
    case "payment_link.expired":
      await settleClosed(order, "expired");
      break;
    case "payment_link.cancelled":
      await settleClosed(order, "cancelled");
      break;
    default:
      break;
  }
}

export async function listOrdersForUser(userId: Types.ObjectId | string, limit = 20): Promise<PaymentOrderDoc[]> {
  return PaymentOrderModel.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}
