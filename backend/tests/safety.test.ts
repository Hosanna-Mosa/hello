/**
 * Phase 7: blocks and reports.
 *
 * The phase's own verification is the shape of this file: after a block, both
 * parties vanish from discovery, search, likes, matches and sockets IN THE
 * SAME REQUEST — and a report survives the erasure of the person it is about.
 *
 * The cases that matter are the asymmetric ones. A block that only works one
 * way. An unblock that quietly undoes THEIR block as well as yours. A report
 * whose evidence is a reference to a conversation the same block just deleted.
 */

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { BlockModel } from "@/models/block.model.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { ReportModel } from "@/models/report.model.js";
import { ThreadModel } from "@/models/thread.model.js";
import { UserModel } from "@/models/user.model.js";
import { ANCHOR } from "@/seed/profiles.seed.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
let counter = 0;

beforeAll(async () => {
  await startTestEnv();
  for (const m of [UserModel, ThreadModel, MessageModel, LikeModel, MatchModel, BlockModel, ReportModel]) {
    await m.syncIndexes();
  }
});
afterAll(stopTestEnv);
beforeEach(wipe);

async function makeUser(name: string) {
  counter += 1;
  const phoneNumber = String(7760000000 + counter);

  const code = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });
  const session = await request(app)
    .post("/v1/auth/verify")
    .send({ countryCode: "44", phoneNumber, code: code.body.devCode });

  const auth = `Bearer ${session.body.token}`;
  await request(app)
    .patch("/v1/me")
    .set("authorization", auth)
    .send({
      name,
      birthday: "1993-03-03",
      location: {
        coordinate: { latitude: ANCHOR.latitude, longitude: ANCHOR.longitude },
        fix: { capturedAt: new Date().toISOString(), accuracyMetres: 100 },
      },
    });
  await request(app).post("/v1/auth/onboarding/complete").set("authorization", auth);

  return { auth, id: session.body.userId as string, name };
}

async function makeMatchedPair() {
  const a = await makeUser("Ada");
  const b = await makeUser("Ben");

  await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
  const matched = await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });

  return { a, b, threadId: matched.body.match.threadId as string, matchId: matched.body.match.id as string };
}

const idsIn = (body: { id: string }[]) => body.map((row) => row.id);

describe("a block is symmetric", () => {
  it("hides each from the other's discovery, both directions, from one request", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    // Each can see the other to begin with.
    expect(idsIn((await request(app).get("/v1/profiles").set("authorization", a.auth)).body.items))
      .toContain(b.id);
    expect(idsIn((await request(app).get("/v1/profiles").set("authorization", b.auth)).body.items))
      .toContain(a.id);

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });

    // A blocked B. B must disappear for A *and* A for B — the whole point.
    expect(idsIn((await request(app).get("/v1/profiles").set("authorization", a.auth)).body.items))
      .not.toContain(b.id);
    expect(idsIn((await request(app).get("/v1/profiles").set("authorization", b.auth)).body.items))
      .not.toContain(a.id);
  });

  it("hides each from the other's search", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Bethany");

    expect(idsIn((await request(app).get("/v1/profiles/search?q=Beth").set("authorization", a.auth)).body))
      .toContain(b.id);

    await request(app).post("/v1/blocks").set("authorization", b.auth).send({ userId: a.id });

    // B blocked A, so A's search must not find B either.
    expect(idsIn((await request(app).get("/v1/profiles/search?q=Beth").set("authorization", a.auth)).body))
      .toEqual([]);
  });

  it("answers notFound to a direct profile fetch, in both directions", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });

    expect((await request(app).get(`/v1/profiles/${b.id}`).set("authorization", a.auth)).status).toBe(404);
    expect((await request(app).get(`/v1/profiles/${a.id}`).set("authorization", b.auth)).status).toBe(404);
  });

  it("refuses a like in either direction", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });

    // Neither can reach the other by posting the id directly.
    expect((await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id })).status)
      .toBe(404);
    expect((await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id })).status)
      .toBe(404);
  });
});

describe("blocking someone you are matched with", () => {
  it("ends the match and deletes the conversation for BOTH sides", async () => {
    const { a, b, threadId } = await makeMatchedPair();

    await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "before the block" });

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });

    for (const who of [a, b]) {
      expect((await request(app).get("/v1/threads").set("authorization", who.auth)).body).toEqual([]);
      expect((await request(app).get("/v1/matches").set("authorization", who.auth)).body).toEqual([]);
    }

    // And the thread is gone, not merely hidden — so no socket room survives.
    expect(await ThreadModel.countDocuments({ _id: threadId })).toBe(0);
    expect(await MessageModel.countDocuments({ threadId })).toBe(0);
  });

  it("removes the likes, so the blocked person cannot resurface in Likes", async () => {
    const { a, b } = await makeMatchedPair();

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });

    expect((await request(app).get("/v1/likes/inbound").set("authorization", a.auth)).body).toEqual([]);
    expect((await request(app).get("/v1/likes/inbound").set("authorization", b.auth)).body).toEqual([]);
    expect(await LikeModel.countDocuments({})).toBe(0);
  });

  it("keeps the match row, so the pair can never recur in the deck", async () => {
    const { a, b, matchId } = await makeMatchedPair();

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });

    const match = await MatchModel.findById(matchId);
    expect(match).not.toBeNull();
    expect(match?.endedAt).not.toBeNull();
    expect(match?.threadId).toBeNull();
  });
});

describe("unblocking", () => {
  it("undoes only YOUR block, never theirs", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    // Both blocked each other. A relents; B has not.
    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });
    await request(app).post("/v1/blocks").set("authorization", b.auth).send({ userId: a.id });

    await request(app).delete(`/v1/blocks/${b.id}`).set("authorization", a.auth).expect(204);

    // B's block stands, so they still cannot see each other.
    expect(idsIn((await request(app).get("/v1/profiles").set("authorization", a.auth)).body.items))
      .not.toContain(b.id);
    expect(await BlockModel.countDocuments({ blockerId: b.id, blockedUserId: a.id })).toBe(1);
    expect(await BlockModel.countDocuments({ blockerId: a.id, blockedUserId: b.id })).toBe(0);
  });

  it("restores discovery once the last block goes", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });
    await request(app).delete(`/v1/blocks/${b.id}`).set("authorization", a.auth).expect(204);

    // The cached hidden set must have been invalidated for BOTH of them.
    expect(idsIn((await request(app).get("/v1/profiles").set("authorization", a.auth)).body.items))
      .toContain(b.id);
    expect(idsIn((await request(app).get("/v1/profiles").set("authorization", b.auth)).body.items))
      .toContain(a.id);
  });
});

describe("the blocked list", () => {
  it("names the people you blocked, who are unreachable by any other route", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });

    const [row] = (await request(app).get("/v1/blocks").set("authorization", a.auth)).body;

    expect(row.blockedUserId).toBe(b.id);
    // The embedded summary is the only way this screen can render a name.
    expect(row.user.name).toBe("Ben");
    // And it carries no location: where someone you blocked is standing is
    // not this screen's business.
    expect(row.user.distanceMetres).toBe(0);
  });

  it("lists who YOU blocked, not who blocked you", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    await request(app).post("/v1/blocks").set("authorization", b.auth).send({ userId: a.id });

    // A was blocked. A must not learn that from their own blocked list.
    expect((await request(app).get("/v1/blocks").set("authorization", a.auth)).body).toEqual([]);
  });

  it("is idempotent — blocking twice yields one row", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id }).expect(200);
    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id }).expect(200);

    expect((await request(app).get("/v1/blocks").set("authorization", a.auth)).body).toHaveLength(1);
  });
});

describe("reports", () => {
  it("keeps the conversation as a snapshot, so a block cannot destroy the evidence", async () => {
    const { a, b, threadId } = await makeMatchedPair();

    await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", b.auth)
      .send({ body: "the thing being reported" });

    // Report AND block in one action — the block deletes the thread.
    const filed = await request(app)
      .post("/v1/reports")
      .set("authorization", a.auth)
      .send({ reportedUserId: b.id, reason: "romanticAdvance", alsoBlock: true });

    expect(filed.status).toBe(200);
    expect(filed.body.alsoBlocked).toBe(true);

    expect(await MessageModel.countDocuments({ threadId })).toBe(0);

    // The words survive, because the snapshot was taken before the teardown.
    const stored = await ReportModel.findById(filed.body.id);
    expect(stored?.snapshot?.messages.map((m) => m.body)).toContain("the thing being reported");
    expect(stored?.snapshot?.name).toBe("Ben");
  });

  it("survives the erasure of the person it is about", async () => {
    const { a, b } = await makeMatchedPair();

    const filed = await request(app)
      .post("/v1/reports")
      .set("authorization", a.auth)
      .send({ reportedUserId: b.id, reason: "harassment", details: "kept", alsoBlock: false });

    // The reported account goes.
    await UserModel.deleteOne({ _id: b.id });

    const stored = await ReportModel.findById(filed.body.id);
    expect(stored).not.toBeNull();
    expect(stored?.details).toBe("kept");
    // A reference would be empty by now. A snapshot is not.
    expect(stored?.snapshot?.name).toBe("Ben");
  });

  it("tells the reporter nothing about the outcome", async () => {
    const { a, b } = await makeMatchedPair();

    const filed = await request(app)
      .post("/v1/reports")
      .set("authorization", a.auth)
      .send({ reportedUserId: b.id, reason: "spamOrScam", alsoBlock: false });

    // The receipt of their own filing, and nothing else.
    expect(Object.keys(filed.body).sort()).toEqual(
      ["alsoBlocked", "createdAt", "id", "reason", "reportedUserId", "reporterId"].sort(),
    );
    expect(filed.body).not.toHaveProperty("status");
    expect(filed.body).not.toHaveProperty("snapshot");
  });

  it("refuses a reason outside the contract rather than filing it as other", async () => {
    const { a, b } = await makeMatchedPair();

    const res = await request(app)
      .post("/v1/reports")
      .set("authorization", a.auth)
      .send({ reportedUserId: b.id, reason: "heDidntTextBack", alsoBlock: false });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
    expect(await ReportModel.countDocuments({})).toBe(0);
  });

  it("does not let anyone report or block themselves", async () => {
    const a = await makeUser("Ada");

    expect((await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: a.id })).status)
      .toBe(400);
    expect(
      (await request(app)
        .post("/v1/reports")
        .set("authorization", a.auth)
        .send({ reportedUserId: a.id, reason: "other", alsoBlock: false })).status,
    ).toBe(400);
  });
});
