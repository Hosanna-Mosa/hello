/**
 * Sign-up and password sign-in (`POST /auth/signup`, `POST /auth/login`).
 *
 * The properties that matter are the silent ones: the hash never leaves the
 * server, a wrong password and an unknown account are indistinguishable, and a
 * guesser runs into the per-account limit however many IPs they use.
 */

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { UserModel } from "@/models/user.model.js";
import { phoneHmac } from "@/utils/phone.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();

beforeAll(startTestEnv);
afterAll(stopTestEnv);
beforeEach(wipe);

const PERSON = {
  name: "Asha",
  email: "Asha@Example.com",
  countryCode: "91",
  phoneNumber: "9876543210",
  password: "friendly-42",
};

function signup(over: Partial<typeof PERSON> = {}) {
  return request(app).post("/v1/auth/signup").send({ ...PERSON, ...over });
}

function login(identifier: string, password: string) {
  return request(app).post("/v1/auth/login").send({ identifier, password });
}

describe("sign-up", () => {
  it("creates an account, opens a session and starts onboarding", async () => {
    const res = await signup();

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.onboardingComplete).toBe(false);

    const me = await request(app).get("/v1/me").set("Authorization", `Bearer ${res.body.token as string}`);
    expect(me.status).toBe(200);
    expect(me.body.name).toBe("Asha");
  });

  it("stores a scrypt hash, never the password, and indexes only the email's HMAC", async () => {
    await signup();
    const doc = await UserModel.findOne({}).select("+passwordHash").lean();

    expect(doc?.passwordHash).toMatch(/^scrypt\$/);
    expect(JSON.stringify(doc)).not.toContain(PERSON.password);
    expect(doc?.email?.address).toBe("asha@example.com");
    expect(doc?.email?.hmac).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never returns the hash, even on a plain read", async () => {
    await signup();
    const doc = await UserModel.findOne({}).lean();
    expect(doc).not.toHaveProperty("passwordHash");
  });

  it("refuses a taken email, whatever its case", async () => {
    await signup();
    const res = await signup({ email: "ASHA@example.COM", phoneNumber: "9876500000" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/email/i);
  });

  it("refuses a taken phone number", async () => {
    await signup();
    const res = await signup({ email: "other@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/phone/i);
  });

  it.each([
    ["too short", "abc12"],
    ["no number", "onlyletters"],
    ["no letter", "1234567890"],
  ])("refuses a weak password (%s)", async (_label, password) => {
    const res = await signup({ password });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("will not register the store-review email", async () => {
    const res = await signup({ email: "reviewer@example.com" });
    expect(res.status).toBe(400);
  });
});

describe("sign-in", () => {
  it("accepts the email, in any case", async () => {
    const created = await signup();
    const res = await login("  asha@EXAMPLE.com ", PERSON.password);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(created.body.userId);
  });

  it("accepts the phone number in E.164", async () => {
    const created = await signup();
    const res = await login("+919876543210", PERSON.password);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(created.body.userId);
  });

  it("gives a wrong password and an unknown account the SAME answer", async () => {
    await signup();
    const wrong = await login("asha@example.com", "not-it-123");
    const unknown = await login("nobody@example.com", "not-it-123");

    expect(wrong.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(wrong.body.error).toEqual(unknown.body.error);
  });

  it("refuses an OTP-era account that has no password", async () => {
    await UserModel.create({
      phone: { e164: "+447700900001", hmac: phoneHmac("+447700900001"), countryCode: "44", national: "7700900001", display: "+44" },
    });
    const res = await login("+447700900001", "anything-1");
    expect(res.status).toBe(400);
  });

  it("locks one account after 10 guesses, even from different IPs", async () => {
    await signup();
    for (let i = 0; i < 10; i += 1) {
      await login("asha@example.com", `guess-${i}`).set("X-Forwarded-For", `10.0.0.${i}`);
    }
    const res = await login("asha@example.com", PERSON.password).set("X-Forwarded-For", "10.0.1.1");
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("rateLimited");
  });

  it("still lets the store reviewer in through the same form", async () => {
    // The review account is an existing phone account (see review-login.test).
    const target = { countryCode: "44", phoneNumber: "7700999001" };
    const code = await request(app).post("/v1/auth/code").send(target);
    const verified = await request(app)
      .post("/v1/auth/verify")
      .send({ ...target, code: code.body.devCode as string });

    const res = await login("reviewer@example.com", "review-pass-123");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(verified.body.userId);
  });
});
