/**
 * The admin panel API (`/v1/admin`).
 *
 * The properties that matter: nothing is readable without a live admin
 * session; the session lives only in an HttpOnly cookie; a request without the
 * CSRF header is refused even WITH the cookie; sign-out kills the session
 * server-side; and repeated failures lock the account.
 */

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { AdminModel } from "@/models/admin.model.js";
import { UserModel } from "@/models/user.model.js";
import { hashPassword } from "@/utils/password.js";
import { normalizePhone } from "@/utils/phone.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
const EMAIL = "admin@example.com";
const PASSWORD = "correct-horse-battery";
const H = { "x-admin-request": "1" };

beforeAll(startTestEnv);
afterAll(stopTestEnv);
beforeEach(async () => {
  await wipe();
  await AdminModel.create({ email: EMAIL, passwordHash: await hashPassword(PASSWORD) });
});

async function signIn(): Promise<string> {
  const res = await request(app).post("/v1/admin/auth/login").set(H).send({ email: EMAIL, password: PASSWORD });
  expect(res.status).toBe(200);
  const cookie = [res.headers["set-cookie"]].flat()[0] as string;
  return cookie.split(";")[0] as string;
}

describe("admin auth", () => {
  it("sets an HttpOnly, SameSite=Strict cookie and never returns the token in the body", async () => {
    const res = await request(app).post("/v1/admin/auth/login").set(H).send({ email: EMAIL, password: PASSWORD });
    const cookie = [res.headers["set-cookie"]].flat()[0] as string;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/v1\/admin/);
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("refuses a wrong password and an unknown email with the same message", async () => {
    const wrong = await request(app).post("/v1/admin/auth/login").set(H).send({ email: EMAIL, password: "nope-nope-nope" });
    const unknown = await request(app).post("/v1/admin/auth/login").set(H).send({ email: "x@example.com", password: "nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it("locks the account after five failures, even for the right password", async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app).post("/v1/admin/auth/login").set(H).send({ email: EMAIL, password: "wrong-password" });
    }
    const res = await request(app).post("/v1/admin/auth/login").set(H).send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(429);
  });

  it("refuses every data route without a session", async () => {
    for (const path of ["/v1/admin/stats", "/v1/admin/users", "/v1/admin/reports", "/v1/admin/auth/session", "/v1/admin/nope"]) {
      const res = await request(app).get(path).set(H);
      expect(res.status, path).toBe(401);
    }
  });

  it("refuses a valid session cookie without the CSRF header", async () => {
    const cookie = await signIn();
    const res = await request(app).get("/v1/admin/stats").set("cookie", cookie);
    expect(res.status).toBe(401);
  });

  it("refuses an app user's bearer token", async () => {
    const res = await request(app).get("/v1/admin/stats").set(H).set("authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.e30.x");
    expect(res.status).toBe(401);
  });

  it("kills the session server-side on sign-out", async () => {
    const cookie = await signIn();
    expect((await request(app).get("/v1/admin/auth/session").set(H).set("cookie", cookie)).status).toBe(200);
    expect((await request(app).post("/v1/admin/auth/logout").set(H).set("cookie", cookie)).status).toBe(204);
    expect((await request(app).get("/v1/admin/auth/session").set(H).set("cookie", cookie)).status).toBe(401);
  });
});

describe("admin data", () => {
  it("returns live counts and users from the database", async () => {
    await UserModel.create({ phone: normalizePhone("44", "7700900123"), name: "Asha", onboardingComplete: true });
    const cookie = await signIn();

    const stats = await request(app).get("/v1/admin/stats").set(H).set("cookie", cookie);
    expect(stats.status).toBe(200);
    expect(stats.body.users.total).toBe(1);
    expect(stats.body.signups).toHaveLength(14);

    const users = await request(app).get("/v1/admin/users?search=ash").set(H).set("cookie", cookie);
    expect(users.body.total).toBe(1);
    expect(users.body.items[0].name).toBe("Asha");
    expect(JSON.stringify(users.body)).not.toMatch(/hmac/);

    const detail = await request(app).get(`/v1/admin/users/${users.body.items[0].id as string}`).set(H).set("cookie", cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.counts.matches).toBe(0);
  });

  it("answers a malformed id with 404, not a 500", async () => {
    const cookie = await signIn();
    const res = await request(app).get("/v1/admin/users/not-an-id").set(H).set("cookie", cookie);
    expect(res.status).toBe(404);
  });
});
