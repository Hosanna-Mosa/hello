/**
 * Phase 5: threads and messages.
 *
 * The cases here are the quiet ones. A thread readable by a non-participant.
 * A `401` that confirms a thread exists. A retried send that posts twice. A
 * read receipt that marks the wrong person's messages.
 */

import request from "supertest";
import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { MessageModel } from "@/models/message.model.js";
import { ThreadModel } from "@/models/thread.model.js";
import { UserModel } from "@/models/user.model.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { ANCHOR } from "@/seed/profiles.seed.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
let counter = 0;

beforeAll(async () => {
  await startTestEnv();
  for (const m of [UserModel, ThreadModel, MessageModel, LikeModel, MatchModel]) await m.syncIndexes();
});
afterAll(stopTestEnv);
beforeEach(wipe);

async function makeUser(name: string) {
  counter += 1;
  const phoneNumber = String(7740000000 + counter);

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
      location: { coordinate: { latitude: ANCHOR.latitude, longitude: ANCHOR.longitude } },
    });
  await request(app).post("/v1/auth/onboarding/complete").set("authorization", auth);

  return { auth, id: session.body.userId as string };
}

/** Two people who liked each other — the only way a thread exists. */
async function makeMatchedPair() {
  const a = await makeUser("Ada");
  const b = await makeUser("Ben");

  await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
  const matched = await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });

  return { a, b, threadId: matched.body.match.threadId as string };
}

describe("the match gate", () => {
  it("answers notFound — NOT unauthorized — to a non-participant", async () => {
    // `unauthorized` would confirm the thread exists. You could then enumerate
    // ids and learn who is talking to whom.
    const { threadId } = await makeMatchedPair();
    const stranger = await makeUser("Stranger");

    for (const call of [
      request(app).get(`/v1/threads/${threadId}/messages`).set("authorization", stranger.auth),
      request(app).post(`/v1/threads/${threadId}/messages`).set("authorization", stranger.auth).send({ body: "hi" }),
      request(app).post(`/v1/threads/${threadId}/read`).set("authorization", stranger.auth),
      request(app).patch(`/v1/threads/${threadId}`).set("authorization", stranger.auth).send({ muted: true }),
    ]) {
      const res = await call;
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("notFound");
    }
  });

  it("gives each side only their own threads", async () => {
    const { a, b } = await makeMatchedPair();
    const stranger = await makeUser("Nobody");

    expect((await request(app).get("/v1/threads").set("authorization", a.auth)).body).toHaveLength(1);
    expect((await request(app).get("/v1/threads").set("authorization", b.auth)).body).toHaveLength(1);
    expect((await request(app).get("/v1/threads").set("authorization", stranger.auth)).body).toEqual([]);
  });
});

describe("the conversation list", () => {
  /**
   * The app files a thread under "New matches" or under "Conversations" by
   * ONE test: whether `lastMessage` is null. The serializer used to omit the
   * field entirely, so every thread read as a match with nothing said yet and
   * the Chat tab showed no conversations at all, however many messages were in
   * them (PLAN #124).
   */
  it("carries the newest message on each thread, so the list is one request", async () => {
    const { a, b, threadId } = await makeMatchedPair();

    await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "first" });
    await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", b.auth)
      .send({ body: "and the newest" });

    const [thread] = (await request(app).get("/v1/threads").set("authorization", a.auth)).body;

    expect(thread.lastMessage).not.toBeNull();
    expect(thread.lastMessage.body).toBe("and the newest");
    expect(thread.lastMessage.senderId).toBe(b.id);
    expect(thread.lastMessage.threadId).toBe(threadId);
    // No second request was needed to render the row.
    expect(thread.lastMessage.createdAt).toBe(thread.lastMessageAt);
  });

  it("says null when nobody has spoken — a match, not a conversation", async () => {
    const { a } = await makeMatchedPair();

    const [thread] = (await request(app).get("/v1/threads").set("authorization", a.auth)).body;

    // Null is the answer that puts it in "New matches". Absent is not.
    expect(thread).toHaveProperty("lastMessage");
    expect(thread.lastMessage).toBeNull();
  });

  it("derives the preview's status per viewer, like any other message", async () => {
    const { a, b, threadId } = await makeMatchedPair();

    await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "seen?" });

    const sender = (await request(app).get("/v1/threads").set("authorization", a.auth)).body[0];
    const receiver = (await request(app).get("/v1/threads").set("authorization", b.auth)).body[0];

    // Unread by the other side yet, and received by them by definition.
    expect(sender.lastMessage.status).toBe("sent");
    expect(receiver.lastMessage.status).toBe("delivered");

    await request(app).post(`/v1/threads/${threadId}/read`).set("authorization", b.auth);

    const after = (await request(app).get("/v1/threads").set("authorization", a.auth)).body[0];
    expect(after.lastMessage.status).toBe("read");
  });
});

describe("sending", () => {
  it("delivers, and bumps only the OTHER person's unread count", async () => {
    const { a, b, threadId } = await makeMatchedPair();

    const sent = await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "Fancy a quiz night?" });

    expect(sent.status).toBe(200);
    expect(sent.body.body).toBe("Fancy a quiz night?");
    expect(sent.body.senderId).toBe(a.id);

    const forSender = (await request(app).get("/v1/threads").set("authorization", a.auth)).body[0];
    const forOther = (await request(app).get("/v1/threads").set("authorization", b.auth)).body[0];

    // One shared counter would clear the other person's badge when you read.
    expect(forSender.unreadCount).toBe(0);
    expect(forOther.unreadCount).toBe(1);
  });

  it("is idempotent when the same clientMessageId is retried", async () => {
    const { a, threadId } = await makeMatchedPair();
    const clientMessageId = "retry-abc-123";

    const first = await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "sent once", clientMessageId });

    const retry = await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "sent once", clientMessageId });

    expect(retry.status).toBe(200);
    expect(retry.body.id).toBe(first.body.id);
    expect(await MessageModel.countDocuments({ threadId })).toBe(1);
  });

  it("refuses an empty message", async () => {
    const { a, threadId } = await makeMatchedPair();
    const res = await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "   " });

    expect(res.status).toBe(400);
  });
});

describe("read receipts", () => {
  it("derives status per viewer rather than storing it", async () => {
    const { a, b, threadId } = await makeMatchedPair();

    await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "hello" });

    // Before B reads it, A sees "sent".
    let mine = (await request(app).get(`/v1/threads/${threadId}/messages`).set("authorization", a.auth)).body.items[0];
    expect(mine.status).toBe("sent");

    // B receives it — from B's side an inbound message is delivered by definition.
    const theirs = (await request(app).get(`/v1/threads/${threadId}/messages`).set("authorization", b.auth)).body
      .items[0];
    expect(theirs.status).toBe("delivered");

    await request(app).post(`/v1/threads/${threadId}/read`).set("authorization", b.auth);

    // Now A sees "read" — the SAME message, different viewer.
    mine = (await request(app).get(`/v1/threads/${threadId}/messages`).set("authorization", a.auth)).body.items[0];
    expect(mine.status).toBe("read");

    // And nothing was written to the message itself.
    const stored = await MessageModel.findById(mine.id);
    expect(stored).not.toBeNull();
    expect((stored as unknown as Record<string, unknown>).status).toBeUndefined();
  });

  it("clears the badge in one write, whatever the message count", async () => {
    const { a, b, threadId } = await makeMatchedPair();

    for (let i = 0; i < 12; i++) {
      await request(app)
        .post(`/v1/threads/${threadId}/messages`)
        .set("authorization", a.auth)
        .send({ body: `message ${i}` });
    }

    let forB = (await request(app).get("/v1/threads").set("authorization", b.auth)).body[0];
    expect(forB.unreadCount).toBe(12);

    await request(app).post(`/v1/threads/${threadId}/read`).set("authorization", b.auth);

    forB = (await request(app).get("/v1/threads").set("authorization", b.auth)).body[0];
    expect(forB.unreadCount).toBe(0);
  });
});

describe("reactions", () => {
  it("adds, replaces, then removes", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const sent = await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "react to me" });
    const messageId = sent.body.id as string;

    const added = await request(app)
      .post(`/v1/messages/${messageId}/reactions`)
      .set("authorization", b.auth)
      .send({ emoji: "😄" });
    expect(added.body.reactions).toHaveLength(1);
    expect(added.body.reactions[0].emoji).toBe("😄");

    // A different emoji REPLACES — one per user per message.
    const replaced = await request(app)
      .post(`/v1/messages/${messageId}/reactions`)
      .set("authorization", b.auth)
      .send({ emoji: "🎉" });
    expect(replaced.body.reactions).toHaveLength(1);
    expect(replaced.body.reactions[0].emoji).toBe("🎉");

    // The same emoji twice REMOVES.
    const removed = await request(app)
      .post(`/v1/messages/${messageId}/reactions`)
      .set("authorization", b.auth)
      .send({ emoji: "🎉" });
    expect(removed.body.reactions).toEqual([]);
  });

  it("will not let a non-participant react", async () => {
    const { a, threadId } = await makeMatchedPair();
    const stranger = await makeUser("Interloper");
    const sent = await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "private" });

    const res = await request(app)
      .post(`/v1/messages/${sent.body.id}/reactions`)
      .set("authorization", stranger.auth)
      .send({ emoji: "👀" });

    expect(res.status).toBe(404);
  });
});

describe("pagination", () => {
  it("pages newest-first without repeating or skipping", async () => {
    const { a, threadId } = await makeMatchedPair();

    // Inserted directly rather than over HTTP: this case is about READING a
    // long thread, and sending 45 messages through the API tests the rate
    // limiter instead (which is what it did — 30/min, so 15 never existed).
    const base = Date.now();
    await MessageModel.insertMany(
      Array.from({ length: 45 }, (_, i) => ({
        threadId: new Types.ObjectId(threadId),
        senderId: new Types.ObjectId(a.id),
        kind: "text",
        body: `m${i}`,
        createdAt: new Date(base + i * 1000),
      })),
    );

    const seen: string[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < 4; page++) {
      const url: string = cursor
        ? `/v1/threads/${threadId}/messages?cursor=${encodeURIComponent(cursor)}`
        : `/v1/threads/${threadId}/messages`;
      const res = await request(app).get(url).set("authorization", a.auth);
      seen.push(...res.body.items.map((m: { id: string }) => m.id));
      cursor = res.body.nextCursor;
      if (!cursor) break;
    }

    expect(seen).toHaveLength(45);
    expect(new Set(seen).size).toBe(45);
  });

  it("rejects a cursor from a different thread", async () => {
    // Without the thread binding the signature would still verify, and the
    // keyset would silently resolve against the wrong conversation.
    const first = await makeMatchedPair();
    const second = await makeMatchedPair();

    const base = Date.now();
    await MessageModel.insertMany(
      Array.from({ length: 40 }, (_, i) => ({
        threadId: new Types.ObjectId(first.threadId),
        senderId: new Types.ObjectId(first.a.id),
        kind: "text",
        body: `m${i}`,
        createdAt: new Date(base + i * 1000),
      })),
    );

    const page = await request(app)
      .get(`/v1/threads/${first.threadId}/messages`)
      .set("authorization", first.a.auth);

    const res = await request(app)
      .get(`/v1/threads/${second.threadId}/messages?cursor=${encodeURIComponent(page.body.nextCursor)}`)
      .set("authorization", second.a.auth);

    expect(res.status).toBe(400);
  });
});

describe("muting", () => {
  it("is per viewer", async () => {
    const { a, b, threadId } = await makeMatchedPair();

    await request(app).patch(`/v1/threads/${threadId}`).set("authorization", a.auth).send({ muted: true });

    const forA = (await request(app).get("/v1/threads").set("authorization", a.auth)).body[0];
    const forB = (await request(app).get("/v1/threads").set("authorization", b.auth)).body[0];

    expect(forA.muted).toBe(true);
    // Muting must not silence the thread for the other person.
    expect(forB.muted).toBe(false);
  });
});
