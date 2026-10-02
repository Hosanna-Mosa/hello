/**
 * One attempt to buy premium.
 *
 * Created BEFORE the Razorpay payment link, so the link can carry our id as
 * its `reference_id` and every webhook can be matched back to exactly one row.
 *
 * `status` only ever moves forward, and the move to `paid` is a single
 * conditional update (`status: { $ne: "paid" }`). That is what makes granting
 * premium idempotent: Razorpay retries webhooks, the app polls, and both may
 * arrive at once — exactly one of them wins the transition and extends the
 * pass, the rest see it already paid.
 *
 * The amount is copied from the plan at creation. A payment is only accepted
 * if Razorpay reports that same amount in INR — never a figure the client sent.
 */

import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export const PAYMENT_STATUSES = ["created", "paid", "expired", "cancelled", "failed"] as const;

const paymentOrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: String, required: true },
    planLabel: { type: String, required: true },
    period: { type: String, enum: ["month", "sixMonths", "year"], required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["INR"], default: "INR", required: true },

    provider: { type: String, enum: ["razorpay"], default: "razorpay", required: true },
    /** Razorpay payment link id (`plink_…`). Null only between our insert and Razorpay's answer. */
    providerLinkId: { type: String, default: null },
    providerPaymentId: { type: String, default: null },
    paymentUrl: { type: String, default: null },

    status: { type: String, enum: PAYMENT_STATUSES, default: "created", required: true },
    paidAt: { type: Date, default: null },
    /** The premium end date this payment produced, for support and refunds. */
    grantedUntil: { type: Date, default: null },
    /** How the payment was confirmed — the signed webhook, or our own fetch from Razorpay. */
    confirmedVia: { type: String, enum: ["webhook", "poll"], default: null },
  },
  { timestamps: true, strict: "throw", strictQuery: true },
);

paymentOrderSchema.index(
  { providerLinkId: 1 },
  { unique: true, partialFilterExpression: { providerLinkId: { $type: "string" } }, name: "payment_link_unique" },
);
paymentOrderSchema.index({ userId: 1, createdAt: -1 }, { name: "payment_user_recent" });
paymentOrderSchema.index({ status: 1, createdAt: -1 }, { name: "payment_status_recent" });

export type PaymentOrderDoc = HydratedDocument<InferSchemaType<typeof paymentOrderSchema>>;
export const PaymentOrderModel = model("PaymentOrder", paymentOrderSchema);
