/**
 * Phase 4: likes, requests and matches.
 *
 * Every case here is one where getting it wrong is silent. A quota that lets
 * a 16th like through. A rejected like that still wrote a row. A declined
 * request the sender can detect. A pair that can rematch after unmatching.
 * None of them throw; they just quietly break a product rule.
 */

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { env } from "@/config/env.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { MessageRequestModel } from "@/models/messageRequest.model.js";
import { PassModel } from "@/models/pass.model.js";
import { ThreadModel } from "@/models/thread.model.js";
import { UserModel } from "@/models/user.model.js";
import { ANCHOR } from "@/seed/profiles.seed.js";
import { toGeoJsonPoint } from "@/utils/geo.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
let counter = 0;

beforeAll(async () => {
  await startTestEnv();
  for (const m of [UserModel, LikeModel, MatchModel, MessageRequestModel, ThreadModel, MessageModel, PassModel]) {
    await m.syncIndexes();
  }
});
afterAll(stopTestEnv);
beforeEach(wipe);

/** A real signed-in, onboarded person. */
async function makeUser(name: string) {
  counter += 1;
  const phoneNumber = String(7760000000 + counter);

  const code = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });
  const session = await request(app)
    .post("/v1/auth/verify")
    .send({ countryCode: "44", phoneNumber, code: code.body.devCode });

  const token = session.body.token as string;
  await request(app)
    .patch("/v1/me")
    .set("authorization", `Bearer ${token}`)
    .send({
      name,
      birthday: "1994-04-04",
      location: { coordinate: { latitude: ANCHOR.latitude, longitude: ANCHOR.longitude } },
    });
  await request(app).post("/v1/auth/onboarding/complete").set("authorization", `Bearer ${token}`);

  return { token, id: session.body.userId as string, auth: `Bearer ${token}` };
}

let targetBatch = 0;

/** Extra people to spend a quota on. Hmacs must be unique per BATCH, not per user. */
async function makeTargets(n: number) {
  targetBatch += 1;
  const docs = await UserModel.insertMany(
    Array.from({ length: n }, (_, i) => ({
      phone: {
        e164: `+99${targetBatch}0000${String(i).padStart(4, "0")}`,
        hmac: `target-${targetBatch}-${i}`,
        countryCode: "99",
        national: `20000${i}`,
        display: `+99 2 ${i}`,
      },
      name: `Target${i}`,
      nameLower: `target${i}`,
      birthday: new Date("1995-01-01"),
      gender: { kind: "woman" },
      showGender: true,
      publicGenderKind: "woman",
      bio: "seeded",
      location: { point: toGeoJsonPoint(ANCHOR) },
      onboardingComplete: true,
      status: "active",
    })),
  );
  return docs.map((d) => String(d._id));
}

describe("the daily quota", () => {
  it("rejects the 16th like AND writes no row for it", async () => {
    const me = await makeUser("Quota");
    const targets = await makeTargets(env.FREE_DAILY_LIKES + 1);

    for (let i = 0; i < env.FREE_DAILY_LIKES; i++) {
      const res = await request(app).post("/v1/likes").set("authorization", me.auth).send({ toUserId: targets[i] });
      expect(res.status).toBe(200);
    }

    const overflow = targets[env.FREE_DAILY_LIKES]!;
    const res = await request(app).post("/v1/likes").set("authorization", me.auth).send({ toUserId: overflow });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("quotaExceeded");

    // The contract's words: "a rejected like is not recorded".
    expect(await LikeModel.countDocuments({ toUserId: overflow })).toBe(0);
    expect(await LikeModel.countDocuments({ fromUserId: me.id })).toBe(env.FREE_DAILY_LIKES);
  });

  it("does not charge for re-liking the same person", async () => {
    const me = await makeUser("Repeat");
    const [target] = await makeTargets(1);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/v1/likes").set("authorization", me.auth).send({ toUserId: target });
      expect(res.status).toBe(200);
    }

    // Five requests, one like, one unit of quota.
    expect(await LikeModel.countDocuments({ fromUserId: me.id })).toBe(1);

    const targets = await makeTargets(env.FREE_DAILY_LIKES);
    for (let i = 0; i < env.FREE_DAILY_LIKES - 1; i++) {
      const res = await request(app).post("/v1/likes").set("authorization", me.auth).send({ toUserId: targets[i] });
      expect(res.status).toBe(200);
    }
  });
});

describe("likes, notes and matches", () => {
  it("a like WITHOUT a note is silent — no request is created", async () => {
    const me = await makeUser("Quiet");
    const [target] = await makeTargets(1);

    const res = await request(app).post("/v1/likes").set("authorization", me.auth).send({ toUserId: target });

    expect(res.status).toBe(200);
    expect(res.body.match).toBeNull();
    expect(await MessageRequestModel.countDocuments({})).toBe(0);
  });

  it("a like WITH a note creates a message request", async () => {
    const me = await makeUser("Noted");
    const them = await makeUser("Recipient");

    await request(app)
      .post("/v1/likes")
      .set("authorization", me.auth)
      .send({ toUserId: them.id, note: "We both like board games" });

    const inbox = await request(app).get("/v1/requests").set("authorization", them.auth);
    expect(inbox.body).toHaveLength(1);
    expect(inbox.body[0].note).toBe("We both like board games");
    expect(inbox.body[0].status).toBe("pending");
  });

  it("liking back creates a match immediately", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    const first = await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
    expect(first.body.match).toBeNull();

    const second = await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });
    expect(second.body.match).not.toBeNull();
    expect(second.body.match.userIds.sort()).toEqual([a.id, b.id].sort());
  });
});

describe("accepting a request", () => {
  it("creates the match, the thread, and seeds the note as the first message", async () => {
    const sender = await makeUser("Sender");
    const receiver = await makeUser("Receiver");

    await request(app)
      .post("/v1/likes")
      .set("authorization", sender.auth)
      .send({ toUserId: receiver.id, note: "Fancy a quiz night?" });

    const inbox = await request(app).get("/v1/requests").set("authorization", receiver.auth);
    const requestId = inbox.body[0].id as string;

    const accepted = await request(app)
      .post(`/v1/requests/${requestId}/accept`)
      .set("authorization", receiver.auth);

    expect(accepted.status).toBe(200);
    expect(accepted.body.threadId).toBeTruthy();

    const thread = await ThreadModel.findById(accepted.body.threadId);
    expect(thread).not.toBeNull();

    const messages = await MessageModel.find({ threadId: accepted.body.threadId });
    expect(messages).toHaveLength(1);
    expect(messages[0]!.body).toBe("Fancy a quiz night?");
    // The note came from the sender, so it is unread for the person accepting.
    expect(String(messages[0]!.senderId)).toBe(sender.id);
  });

  it("cannot be answered twice", async () => {
    const sender = await makeUser("S2");
    const receiver = await makeUser("R2");
    await request(app).post("/v1/likes").set("authorization", sender.auth).send({ toUserId: receiver.id, note: "hi" });

    const inbox = await request(app).get("/v1/requests").set("authorization", receiver.auth);
    const id = inbox.body[0].id as string;

    await request(app).post(`/v1/requests/${id}/accept`).set("authorization", receiver.auth);
    const again = await request(app).post(`/v1/requests/${id}/accept`).set("authorization", receiver.auth);

    expect(again.status).toBe(400);
  });

  it("someone else's request is notFound, not unauthorized", async () => {
    const sender = await makeUser("S3");
    const receiver = await makeUser("R3");
    const stranger = await makeUser("Stranger");
    await request(app).post("/v1/likes").set("authorization", sender.auth).send({ toUserId: receiver.id, note: "hi" });

    const inbox = await request(app).get("/v1/requests").set("authorization", receiver.auth);
    const id = inbox.body[0].id as string;

    const res = await request(app).post(`/v1/requests/${id}/accept`).set("authorization", stranger.auth);
    expect(res.status).toBe(404);
  });
});

describe("declining is silent (A18)", () => {
  it("leaves the sender's view byte-identical to still-pending", async () => {
    const sender = await makeUser("Hopeful");
    const receiver = await makeUser("Decliner");

    await request(app).post("/v1/likes").set("authorization", sender.auth).send({ toUserId: receiver.id, note: "hello" });

    // What the sender can see BEFORE the decline.
    const before = {
      likes: (await request(app).get("/v1/likes/inbound").set("authorization", sender.auth)).body,
      matches: (await request(app).get("/v1/matches").set("authorization", sender.auth)).body,
      requests: (await request(app).get("/v1/requests").set("authorization", sender.auth)).body,
    };

    const inbox = await request(app).get("/v1/requests").set("authorization", receiver.auth);
    await request(app).post(`/v1/requests/${inbox.body[0].id}/decline`).set("authorization", receiver.auth);

    const after = {
      likes: (await request(app).get("/v1/likes/inbound").set("authorization", sender.auth)).body,
      matches: (await request(app).get("/v1/matches").set("authorization", sender.auth)).body,
      requests: (await request(app).get("/v1/requests").set("authorization", sender.auth)).body,
    };

    // Nothing the sender can observe has changed. That is the requirement.
    expect(after).toEqual(before);
    expect(after.matches).toEqual([]);
  });

  it("records a pass so the decliner does not see them again", async () => {
    const sender = await makeUser("S4");
    const receiver = await makeUser("R4");
    await request(app).post("/v1/likes").set("authorization", sender.auth).send({ toUserId: receiver.id, note: "hi" });

    const inbox = await request(app).get("/v1/requests").set("authorization", receiver.auth);
    await request(app).post(`/v1/requests/${inbox.body[0].id}/decline`).set("authorization", receiver.auth);

    const passed = await PassModel.findOne({ userId: receiver.id, targetId: sender.id });
    expect(passed).not.toBeNull();
    expect(passed!.source).toBe("declinedRequest");
  });
});

describe("unmatching", () => {
  it("deletes the thread but KEEPS the match, so the pair cannot recur", async () => {
    const a = await makeUser("Una");
    const b = await makeUser("Ugo");

    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
    const matched = await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });
    const matchId = matched.body.match.id as string;
    const threadId = matched.body.match.threadId as string;

    const res = await request(app).delete(`/v1/matches/${matchId}`).set("authorization", a.auth);
    expect(res.status).toBe(204);

    // Thread gone for BOTH sides.
    expect(await ThreadModel.findById(threadId)).toBeNull();
    expect(await MessageModel.countDocuments({ threadId })).toBe(0);

    // Match row kept, with endedAt.
    const match = await MatchModel.findById(matchId);
    expect(match).not.toBeNull();
    expect(match!.endedAt).not.toBeNull();

    // And neither side sees it any more.
    expect((await request(app).get("/v1/matches").set("authorization", a.auth)).body).toEqual([]);
    expect((await request(app).get("/v1/matches").set("authorization", b.auth)).body).toEqual([]);
  });

  it("refuses to rematch an ended pair", async () => {
    const a = await makeUser("Rea");
    const b = await makeUser("Reb");

    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
    const matched = await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });
    await request(app).delete(`/v1/matches/${matched.body.match.id}`).set("authorization", a.auth);

    // Wipe the likes so the pair could otherwise match again.
    await LikeModel.deleteMany({});

    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
    const retry = await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });

    expect(retry.status).toBe(400);
    expect(await MatchModel.countDocuments({})).toBe(1);
  });
});

describe("quota atomicity under concurrency", () => {
  it("20 simultaneous likes spend exactly the allowance, never more", async () => {
    // The reason the spend is a Lua script rather than GET-then-INCR: two
    // concurrent requests both read 14, both write 15, and the user gets 16
    // likes. Sequential tests cannot catch that; this can.
    const me = await makeUser("Racer");
    const targets = await makeTargets(20);

    const results = await Promise.all(
      targets.map((toUserId) =>
        request(app).post("/v1/likes").set("authorization", me.auth).send({ toUserId }),
      ),
    );

    const ok = results.filter((r) => r.status === 200).length;
    const refused = results.filter((r) => r.status === 429).length;

    expect(ok).toBe(env.FREE_DAILY_LIKES);
    expect(refused).toBe(20 - env.FREE_DAILY_LIKES);

    // And the database agrees with the counter — no like slipped through.
    expect(await LikeModel.countDocuments({ fromUserId: me.id })).toBe(env.FREE_DAILY_LIKES);
  });
});

describe("connection status (the profile's main button)", () => {
  const status = async (auth: string, userId: string) =>
    (await request(app).get(`/v1/connections/${userId}`).set("authorization", auth)).body as {
      status: string;
      threadId: string | null;
      requestId: string | null;
    };

  it("walks none → requested → matched as the two people act", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");

    expect((await status(a.auth, b.id)).status).toBe("none");

    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id, note: "Coffee?" });
    expect((await status(a.auth, b.id)).status).toBe("requested");

    const incoming = await status(b.auth, a.id);
    expect(incoming.status).toBe("incoming");
    expect(incoming.requestId).toBeTruthy();

    await request(app).post(`/v1/requests/${incoming.requestId as string}/accept`).set("authorization", b.auth);
    const matched = await status(a.auth, b.id);
    expect(matched.status).toBe("matched");
    expect(matched.threadId).toBeTruthy();
  });

  it("a declined request still reads 'requested' to the sender (A18)", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");
    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id, note: "Hi" });
    const { requestId } = await status(b.auth, a.id);
    await request(app).post(`/v1/requests/${requestId as string}/decline`).set("authorization", b.auth);

    expect((await status(a.auth, b.id)).status).toBe("requested");
    expect((await status(b.auth, a.id)).status).toBe("none");
  });

  it("does not reveal a silent like — who likes you is premium", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");
    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
    expect((await status(b.auth, a.id)).status).toBe("none");
  });

  it("answers a bad id or yourself with 404", async () => {
    const a = await makeUser("Ada");
    expect((await request(app).get("/v1/connections/nope").set("authorization", a.auth)).status).toBe(404);
    expect((await request(app).get(`/v1/connections/${a.id}`).set("authorization", a.auth)).status).toBe(404);
  });
});

describe("likes you sent (the 'You liked' screen)", () => {
  const outbound = async (auth: string) =>
    (await request(app).get("/v1/likes/outbound").set("authorization", auth)).body as {
      toUserId: string;
      note?: string;
    }[];

  it("lists only the viewer's own likes, newest first, notes included", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");
    const c = await makeUser("Cy");
    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: c.id, note: "Chess?" });
    await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });

    const mine = await outbound(a.auth);
    expect(mine.map((l) => l.toUserId)).toEqual([c.id, b.id]);
    expect(mine[0]?.note).toBe("Chess?");
    expect((await outbound(b.auth)).map((l) => l.toUserId)).toEqual([a.id]);
  });

  it("needs a session", async () => {
    expect((await request(app).get("/v1/likes/outbound")).status).toBe(401);
  });
});
