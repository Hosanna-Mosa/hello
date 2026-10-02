/**
 * The thin Razorpay client: payment links and webhook signatures.
 *
 * Plain `fetch` with basic auth rather than the SDK — two endpoints do not
 * justify a dependency, and this keeps exactly what is sent visible.
 *
 * WHY PAYMENT LINKS. The app opens the link in the phone's browser, so the app
 * needs no payment SDK or WebView (neither is an approved app dependency), and
 * card details never touch our code. Razorpay hosts the checkout page.
 *
 * The key secret and webhook secret live only in `backend/.env`. The app never
 * sees either, and never needs the key id either: the server makes the link.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { ApiError } from "@/errors/ApiError.js";

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET);
}

function authHeader(): string {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw ApiError.server("Payments are not configured on this server.");
  }
  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    logger.error({ err: e, path }, "[razorpay] request failed");
    throw ApiError.server("We couldn't reach the payment provider. Please try again.");
  }
  const data = (await res.json().catch(() => null)) as T & { error?: { description?: string } };
  if (!res.ok) {
    // Razorpay's description goes to the log, not the client.
    logger.error({ status: res.status, path, error: data?.error }, "[razorpay] request refused");
    throw ApiError.server("The payment provider refused the request. Please try again.");
  }
  return data;
}

export type RazorpayLink = {
  id: string;
  short_url: string;
  status: "created" | "partially_paid" | "paid" | "expired" | "cancelled";
  amount: number;
  amount_paid: number;
  currency: string;
  reference_id: string;
  payments?: { payment_id: string; status: string; amount: number }[] | null;
};

export function createPaymentLink(input: {
  referenceId: string;
  amountMinor: number;
  description: string;
  expireBy: Date;
  notes: Record<string, string>;
}): Promise<RazorpayLink> {
  return call<RazorpayLink>("POST", "/payment_links", {
    amount: input.amountMinor,
    currency: "INR",
    accept_partial: false,
    reference_id: input.referenceId,
    description: input.description,
    expire_by: Math.floor(input.expireBy.getTime() / 1000),
    // We tell the app; Razorpay must not SMS or email anyone on our behalf.
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: input.notes,
  });
}

export function fetchPaymentLink(linkId: string): Promise<RazorpayLink> {
  return call<RazorpayLink>("GET", `/payment_links/${encodeURIComponent(linkId)}`);
}

/**
 * `X-Razorpay-Signature` is HMAC-SHA256 of the RAW request body with the
 * webhook secret. Raw, not re-serialised JSON: re-encoding can change bytes and
 * fail a genuine signature — or, worse, be made to pass a forged one.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex"));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
