/**
 * The store-review sign-in (`POST /auth/email`).
 *
 * The property that matters: the right email + password opens THE configured
 * phone account — the same user id its own OTP sign-in gets — and nothing
 * else ever does.
 */

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();

// Matches REVIEW_LOGIN_* in vitest.config.ts.
const EMAIL = "reviewer@example.com";
const PASSWORD = "review-pass-123";
const TARGET = { countryCode: "44", phoneNumber: "7700999001" };

beforeAll(startTestEnv);
afterAll(stopTestEnv);
beforeEach(wipe);

async function registerTarget(): Promise<string> {
  const code = await request(app).post("/v1/auth/code").send(TARGET);
  const res = await request(app)
    .post("/v1/auth/verify")
    .send({ ...TARGET, code: code.body.devCode as string });
  return res.body.userId as string;
}

describe("review login", () => {
  it("opens the configured phone account", async () => {
    const userId = await registerTarget();

    const res = await request(app).post("/v1/auth/email").send({ email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(userId);
    expect(res.body.token).toBeTruthy();

    const me = await request(app).get("/v1/me").set("authorization", `Bearer ${res.body.token as string}`);
    expect(me.status).toBe(200);
  });

  it("ignores case and whitespace in the email", async () => {
    const userId = await registerTarget();
    const res = await request(app)
      .post("/v1/auth/email")
      .send({ email: `  ${EMAIL.toUpperCase()} `, password: PASSWORD });
    expect(res.body.userId).toBe(userId);
  });

  it("ignores whitespace around a pasted password", async () => {
    const userId = await registerTarget();
    const res = await request(app)
      .post("/v1/auth/email")
      .send({ email: EMAIL, password: ` ${PASSWORD}\n` });
    expect(res.body.userId).toBe(userId);
  });

  it("rejects a wrong password with `validation`", async () => {
    await registerTarget();
    const res = await request(app).post("/v1/auth/email").send({ email: EMAIL, password: "nope-nope" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("rejects a wrong email", async () => {
    await registerTarget();
    const res = await request(app).post("/v1/auth/email").send({ email: "x@example.com", password: PASSWORD });
    expect(res.status).toBe(400);
  });

  it("never creates the account when the number is not registered", async () => {
    const res = await request(app).post("/v1/auth/email").send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(400);
  });
});
