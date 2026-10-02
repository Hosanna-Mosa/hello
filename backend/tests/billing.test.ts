/**
 * Premium purchases (Razorpay) and the admin's user actions.
 *
 * The cases that matter are the ones where getting it wrong hands out premium
 * for free: an unsigned webhook, a replayed one, a link paid for less than the
 * plan. Razorpay's HTTP API is stubbed; the webhook is signed with the test
 * secret exactly as Razorpay would sign it.
 */

import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "@/app.js";
import { env } from "@/config/env.js";
import { AdminModel } from "@/models/admin.model.js";
import { PaymentOrderModel } from "@/models/paymentOrder.model.js";
import { PlanModel } from "@/models/plan.model.js";
import { UserModel } from "@/models/user.model.js";
import { hashPassword } from "@/utils/password.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
const H = { "x-admin-request": "1" };
let counter = 0;

beforeAll(async () => {
  await startTestEnv();
  await PaymentOrderModel.syncIndexes();
});
afterAll(stopTestEnv);
beforeEach(async () => {
  await wipe();
  await PlanModel.create({ _id: "plan-1m", label: "1 month", priceMinor: 29900, period: "month", sortOrder: 0 });
  await AdminModel.create({ email: "admin@example.com", passwordHash: await hashPassword("correct-horse-battery") });
});
afterEach(() => vi.restoreAllMocks());

async function makeUser() {
  counter += 1;
  const phoneNumber = String(7780000000 + counter);
  const code = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });
  const s = await request(app).post("/v1/auth/verify").send({ countryCode: "44", phoneNumber, code: code.body.devCode });
  return { id: s.body.userId as string, auth: `Bearer ${s.body.token as string}` };
}

/** Stubs Razorpay's "create payment link" with a link of our choosing. */
function stubRazorpayCreate(linkId: string) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const body = JSON.parse(String((init as RequestInit).body)) as { reference_id: string; amount: number };
    return new Response(
      JSON.stringify({ id: linkId, short_url: `https://rzp.io/i/${linkId}`, status: "created", amount: body.amount, amount_paid: 0, currency: "INR", reference_id: body.reference_id }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
}

function signedWebhook(payload: unknown) {
  const raw = JSON.stringify(payload);
  const sig = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET!).update(raw).digest("hex");
  return request(app)
    .post("/v1/billing/razorpay/webhook")
    .set("content-type", "application/json")
    .set("x-razorpay-signature", sig)
    .send(raw);
}

const paidEvent = (linkId: string, orderId: string, amountPaid: number) => ({
  event: "payment_link.paid",
  payload: {
    payment_link: { entity: { id: linkId, status: "paid", amount: 29900, amount_paid: amountPaid, currency: "INR", reference_id: orderId } },
    payment: { entity: { id: "pay_test_1" } },
  },
});

async function buy(user: { auth: string }, linkId: string) {
  stubRazorpayCreate(linkId);
  const res = await request(app).post("/v1/billing/orders").set("authorization", user.auth).send({ planId: "plan-1m" });
  expect(res.status).toBe(201);
  expect(res.body.paymentUrl).toBe(`https://rzp.io/i/${linkId}`);
  return res.body.id as string;
}

describe("buying premium", () => {
  it("a signed paid webhook grants a month of premium — once, however often it is replayed", async () => {
    const user = await makeUser();
    const orderId = await buy(user, "plink_ok");

    expect((await signedWebhook(paidEvent("plink_ok", orderId, 29900))).status).toBe(200);
    const after = await UserModel.findById(user.id).lean();
    expect(after?.entitlements.isPremium).toBe(true);
    const until = after!.entitlements.expiresAt!.getTime();
    expect(until).toBeGreaterThan(Date.now() + 27 * 86_400_000);

    // Razorpay retries: the second delivery must not add another month.
    await signedWebhook(paidEvent("plink_ok", orderId, 29900));
    expect((await UserModel.findById(user.id).lean())!.entitlements.expiresAt!.getTime()).toBe(until);

    const ent = await request(app).get("/v1/me/entitlements").set("authorization", user.auth);
    expect(ent.body.isPremium).toBe(true);
    expect(ent.body.likesRemaining).toBe(-1);
  });

  it("ignores an unsigned or wrongly signed webhook", async () => {
    const user = await makeUser();
    const orderId = await buy(user, "plink_forged");
    const res = await request(app)
      .post("/v1/billing/razorpay/webhook")
      .set("content-type", "application/json")
      .set("x-razorpay-signature", "0".repeat(64))
      .send(JSON.stringify(paidEvent("plink_forged", orderId, 29900)));
    expect(res.status).toBe(400);
    expect((await UserModel.findById(user.id).lean())?.entitlements.isPremium).toBe(false);
  });

  it("does not grant for a link paid at less than the plan's price", async () => {
    const user = await makeUser();
    const orderId = await buy(user, "plink_cheap");
    await signedWebhook(paidEvent("plink_cheap", orderId, 100));
    expect((await UserModel.findById(user.id).lean())?.entitlements.isPremium).toBe(false);
    expect((await PaymentOrderModel.findById(orderId).lean())?.status).toBe("created");
  });

  it("an expired pass is free again, everywhere", async () => {
    const user = await makeUser();
    await UserModel.updateOne(
      { _id: user.id },
      { $set: { "entitlements.isPremium": true, "entitlements.expiresAt": new Date(Date.now() - 1000) } },
    );
    const ent = await request(app).get("/v1/me/entitlements").set("authorization", user.auth);
    expect(ent.body.isPremium).toBe(false);
  });
});

describe("admin user actions", () => {
  async function adminCookie() {
    const res = await request(app).post("/v1/admin/auth/login").set(H).send({ email: "admin@example.com", password: "correct-horse-battery" });
    return ([res.headers["set-cookie"]].flat()[0] as string).split(";")[0] as string;
  }

  it("suspend locks the account out at once; reactivate lets it back", async () => {
    const cookie = await adminCookie();
    const user = await makeUser();

    const s = await request(app).post(`/v1/admin/users/${user.id}/status`).set(H).set("cookie", cookie).send({ status: "suspended", reason: "spam" });
    expect(s.status).toBe(200);
    expect(s.body.status).toBe("suspended");
    expect((await request(app).get("/v1/me").set("authorization", user.auth)).status).toBe(401);

    const a = await request(app).post(`/v1/admin/users/${user.id}/status`).set(H).set("cookie", cookie).send({ status: "active" });
    expect(a.body.status).toBe("active");
  });

  it("grants premium for N days and revokes it", async () => {
    const cookie = await adminCookie();
    const user = await makeUser();

    const g = await request(app).post(`/v1/admin/users/${user.id}/premium`).set(H).set("cookie", cookie).send({ isPremium: true, days: 7 });
    expect(g.body.premium.active).toBe(true);
    expect(g.body.premium.source).toBe("admin");

    const r = await request(app).post(`/v1/admin/users/${user.id}/premium`).set(H).set("cookie", cookie).send({ isPremium: false });
    expect(r.body.premium.active).toBe(false);
  });

  it("deletes with the same archive as the user's own delete", async () => {
    const cookie = await adminCookie();
    const user = await makeUser();
    const d = await request(app).post(`/v1/admin/users/${user.id}/delete`).set(H).set("cookie", cookie).send({ reason: "abuse" });
    expect(d.status).toBe(200);
    expect(d.body.status).toBe("erased");
    expect((await request(app).get("/v1/me").set("authorization", user.auth)).status).toBe(401);
  });

  it("requires a session for every action", async () => {
    const user = await makeUser();
    for (const path of ["status", "premium", "delete"]) {
      const res = await request(app).post(`/v1/admin/users/${user.id}/${path}`).set(H).send({});
      expect(res.status, path).toBe(401);
    }
  });
});
