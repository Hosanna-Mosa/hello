/**
 * Phase 1 security behaviour.
 *
 * These are the cases where getting it wrong is silent: an account that still
 * works after deletion, a stolen refresh token that keeps working, a 17-year-old
 * who got in. None of them show up as an error in a log.
 */

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { clearResendGate, startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
let phoneCounter = 0;

beforeAll(startTestEnv);
afterAll(stopTestEnv);
beforeEach(wipe);

/** A fresh number per test, so the resend gate never crosses between them. */
function nextPhone(): string {
  phoneCounter += 1;
  return String(7700000000 + phoneCounter);
}

async function signIn(phoneNumber = nextPhone()) {
  const code = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });
  const devCode = code.body.devCode as string;

  const session = await request(app)
    .post("/v1/auth/verify")
    .send({ countryCode: "44", phoneNumber, code: devCode });

  return { phoneNumber, ...(session.body as { token: string; refreshToken: string; userId: string }) };
}

describe("OTP", () => {
  it("returns a dev code and a resend window", async () => {
    const res = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber: nextPhone() });
    expect(res.status).toBe(200);
    expect(res.body.resendAfterSec).toBeGreaterThan(0);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
  });

  it("rejects a wrong code with `validation`", async () => {
    const phoneNumber = nextPhone();
    await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });

    const res = await request(app)
      .post("/v1/auth/verify")
      .send({ countryCode: "44", phoneNumber, code: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("will not accept the same code twice", async () => {
    const phoneNumber = nextPhone();
    const { body } = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });

    const first = await request(app)
      .post("/v1/auth/verify")
      .send({ countryCode: "44", phoneNumber, code: body.devCode });
    expect(first.status).toBe(200);

    const replay = await request(app)
      .post("/v1/auth/verify")
      .send({ countryCode: "44", phoneNumber, code: body.devCode });
    expect(replay.status).toBe(400);
  });

  it("holds the resend gate", async () => {
    const phoneNumber = nextPhone();
    await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });
    const again = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });

    expect(again.status).toBe(429);
    expect(again.body.error.code).toBe("rateLimited");
  });
});

describe("the 18+ gate", () => {
  it("rejects an under-18 birthday with `validation`, not by hiding them", async () => {
    const { token } = await signIn();
    const res = await request(app)
      .patch("/v1/me")
      .set("authorization", `Bearer ${token}`)
      .send({ birthday: "2015-01-01" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("rejects a birthday in the future", async () => {
    const { token } = await signIn();
    const res = await request(app)
      .patch("/v1/me")
      .set("authorization", `Bearer ${token}`)
      .send({ birthday: "2090-01-01" });

    expect(res.status).toBe(400);
  });

  it("accepts exactly 18", async () => {
    const { token } = await signIn();
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - 18);
    const res = await request(app)
      .patch("/v1/me")
      .set("authorization", `Bearer ${token}`)
      .send({ birthday: d.toISOString().slice(0, 10) });

    expect(res.status).toBe(200);
  });
});

describe("refresh rotation", () => {
  it("rotates on use", async () => {
    const { refreshToken } = await signIn();
    const res = await request(app).post("/v1/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(refreshToken);
    expect(res.body.token).toBeTruthy();
  });

  it("treats a REPLAYED refresh token as theft and kills the whole family", async () => {
    const { refreshToken } = await signIn();

    const rotated = await request(app).post("/v1/auth/refresh").send({ refreshToken });
    const newRefresh = rotated.body.refreshToken as string;

    // The stolen one.
    const replay = await request(app).post("/v1/auth/refresh").send({ refreshToken });
    expect(replay.status).toBe(401);

    // And the legitimate one is now dead too — that is the point.
    const after = await request(app).post("/v1/auth/refresh").send({ refreshToken: newRefresh });
    expect(after.status).toBe(401);
  });
});

describe("sign out", () => {
  it("kills the access token immediately, not in 15 minutes", async () => {
    const { token } = await signIn();

    expect((await request(app).get("/v1/me").set("authorization", `Bearer ${token}`)).status).toBe(200);
    expect((await request(app).post("/v1/auth/signout").set("authorization", `Bearer ${token}`)).status).toBe(204);
    expect((await request(app).get("/v1/me").set("authorization", `Bearer ${token}`)).status).toBe(401);
  });
});

describe("account deletion", () => {
  it("stops the existing access token working at once", async () => {
    const { token } = await signIn();
    await request(app).patch("/v1/me").set("authorization", `Bearer ${token}`).send({ name: "Jo", birthday: "1992-02-02" });

    expect((await request(app).delete("/v1/me").set("authorization", `Bearer ${token}`).send({ reason: "x" })).status).toBe(204);
    expect((await request(app).get("/v1/me").set("authorization", `Bearer ${token}`)).status).toBe(401);
  });

  it("is soft, and signing in again restores the profile intact", async () => {
    const { token, phoneNumber } = await signIn();
    await request(app)
      .patch("/v1/me")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "Rai", birthday: "1991-03-03" });
    await request(app).delete("/v1/me").set("authorization", `Bearer ${token}`).send({});

    // A different number would be a new account; this must be the same one.
    // The resend gate is real and correct — it just has to be stepped over here
    // rather than slept through.
    await clearResendGate("44", phoneNumber);
    const code = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });
    const back = await request(app)
      .post("/v1/auth/verify")
      .send({ countryCode: "44", phoneNumber, code: code.body.devCode });

    expect(back.status).toBe(200);

    const me = await request(app).get("/v1/me").set("authorization", `Bearer ${back.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.name).toBe("Rai");
  });
});

describe("onboarding", () => {
  it("cannot be completed without a name and birthday", async () => {
    const { token } = await signIn();
    const res = await request(app).post("/v1/auth/onboarding/complete").set("authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe("the error envelope", () => {
  it("is the contract's shape for every failure", async () => {
    const res = await request(app).get("/v1/me");
    expect(res.status).toBe(401);
    expect(Object.keys(res.body)).toEqual(["error"]);
    expect(Object.keys(res.body.error).sort()).toEqual(["code", "message"]);
  });

  it("uses notFound for an unknown endpoint", async () => {
    const res = await request(app).get("/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("notFound");
  });
});
