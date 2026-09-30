/**
 * Subscription plans. Product-owned reference data, so prices and the
 * "Best value" ribbon change without a deploy.
 *
 * `priceMinor` is an integer in minor units (paise). Money is never a float —
 * 9.99 is not representable in binary and rounding errors in prices are the
 * kind of bug that reaches an invoice.
 *
 * PLAN R13 still applies: these are placeholders. Real billing needs in-app
 * purchase, stated renewal terms and a working Restore before it can ship.
 */

import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const planSchema = new Schema(
  {
    _id: { type: String, required: true },
    label: { type: String, required: true, maxlength: 40 },
    priceMinor: { type: Number, required: true, min: 0 },
    // INR only — the product shows no other currency.
    currency: { type: String, enum: ["INR"], default: "INR", required: true },
    period: { type: String, enum: ["month", "sixMonths", "year"], required: true },
    highlighted: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false, strict: "throw", strictQuery: true, timestamps: true },
);

planSchema.index({ sortOrder: 1 }, { name: "plan_order" });

export type PlanDoc = HydratedDocument<InferSchemaType<typeof planSchema>>;
export const PlanModel = model("Plan", planSchema);
