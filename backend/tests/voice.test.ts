/**
 * Voice messages.
 *
 * What must hold: only the two people in a conversation can post or play its
 * audio; what is stored is really audio; a retried upload does not post twice
 * or leave an orphan file; and ending the conversation removes the audio.
 */

import { existsSync, readdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { env } from "@/config/env.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { ThreadModel } from "@/models/thread.model.js";
import { UserModel } from "@/models/user.model.js";
import { ANCHOR } from "@/seed/profiles.seed.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
let counter = 0;

const VOICE_ROOT = resolve(env.VOICE_DIR);

/** The smallest thing that passes the sniff: an MP4 `ftyp` box, then padding. */
function fakeM4a(size = 2048): Buffer {
  const buf = Buffer.alloc(size, 7);
  buf.writeUInt32BE(24, 0);
  buf.write("ftypM4A ", 4, "latin1");
  return buf;
}

beforeAll(async () => {
  await startTestEnv();
  for (const m of [UserModel, ThreadModel, MessageModel, LikeModel, MatchModel]) await m.syncIndexes();
});
afterAll(async () => {
  await rm(VOICE_ROOT, { recursive: true, force: true });
  await stopTestEnv();
});
beforeEach(async () => {
  await wipe();
  await rm(VOICE_ROOT, { recursive: true, force: true });
});

async function makeUser(name: string) {
  counter += 1;
  const phoneNumber = String(7750000000 + counter);

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

async function makeMatchedPair() {
  const a = await makeUser("Ada");
  const b = await makeUser("Ben");

  await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
  const matched = await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });

  return {
    a,
    b,
    threadId: matched.body.match.threadId as string,
    matchId: matched.body.match.id as string,
  };
}

function upload(auth: string, threadId: string, body: Buffer, query = "durationSec=3.2") {
  return request(app)
    .post(`/v1/threads/${threadId}/voice?${query}`)
    .set("authorization", auth)
    .set("content-type", "audio/mp4")
    .send(body);
}

describe("voice messages", () => {
  it("posts a voice message the other person can play", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const audio = fakeM4a();

    const sent = await upload(a.auth, threadId, audio);
    expect(sent.status).toBe(200);
    expect(sent.body.kind).toBe("voice");
    expect(sent.body.voice).toEqual({ url: `/v1/messages/${sent.body.id}/voice`, durationSec: 3.2 });
    // The storage path is server-only.
    expect(JSON.stringify(sent.body)).not.toContain(".m4a");

    const played = await request(app)
      .get(sent.body.voice.url)
      .set("authorization", b.auth)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => done(null, Buffer.concat(chunks)));
      });
    expect(played.status).toBe(200);
    expect(played.headers["content-type"]).toContain("audio/mp4");
    expect(Buffer.compare(played.body as Buffer, audio)).toBe(0);

    // It shows in the conversation and as the chat-list preview.
    const page = await request(app).get(`/v1/threads/${threadId}/messages`).set("authorization", b.auth);
    expect(page.body.items[0].kind).toBe("voice");
    const list = await request(app).get("/v1/threads").set("authorization", b.auth);
    expect(list.body[0].lastMessage.body).toBe("Voice message");
  });

  it("accepts a clip sent with an EMPTY content type (what expo/fetch sends for a file Blob)", async () => {
    const { a, threadId } = await makeMatchedPair();

    // superagent drops an empty header, so send an unrelated type instead: the
    // point is the same — the header does not decide, the MP4 sniff does.
    const sent = await request(app)
      .post(`/v1/threads/${threadId}/voice?durationSec=2`)
      .set("authorization", a.auth)
      .set("content-type", "text/plain")
      .send(fakeM4a());
    expect(sent.status).toBe(200);
    expect(sent.body.kind).toBe("voice");
  });

  it("answers a Range request, so the player can seek", async () => {
    const { a, threadId } = await makeMatchedPair();
    const sent = await upload(a.auth, threadId, fakeM4a(4096));

    const part = await request(app)
      .get(sent.body.voice.url)
      .set("authorization", a.auth)
      .set("range", "bytes=0-99");
    expect(part.status).toBe(206);
    expect(part.headers["content-length"]).toBe("100");
  });

  it("is notFound to a stranger — both posting and playing", async () => {
    const { a, threadId } = await makeMatchedPair();
    const stranger = await makeUser("Stranger");
    const sent = await upload(a.auth, threadId, fakeM4a());

    const post = await upload(stranger.auth, threadId, fakeM4a());
    expect(post.status).toBe(404);
    const play = await request(app).get(sent.body.voice.url).set("authorization", stranger.auth);
    expect(play.status).toBe(404);

    // The stranger's upload wrote nothing.
    expect(readdirSync(join(VOICE_ROOT, threadId))).toHaveLength(1);
  });

  it("refuses bytes that are not audio", async () => {
    const { a, threadId } = await makeMatchedPair();
    const res = await upload(a.auth, threadId, Buffer.from("<html>not audio</html>"));
    expect(res.status).toBe(400);
    expect(existsSync(join(VOICE_ROOT, threadId))).toBe(false);
  });

  it("refuses an over-size recording with a 400, not a 500", async () => {
    const { a, threadId } = await makeMatchedPair();
    const res = await upload(a.auth, threadId, fakeM4a(env.VOICE_MAX_BYTES + 1));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("refuses a missing or absurd duration", async () => {
    const { a, threadId } = await makeMatchedPair();
    expect((await upload(a.auth, threadId, fakeM4a(), "")).status).toBe(400);
    expect((await upload(a.auth, threadId, fakeM4a(), "durationSec=100000")).status).toBe(400);
  });

  it("a retried upload posts once and leaves no orphan file", async () => {
    const { a, threadId } = await makeMatchedPair();
    const q = "durationSec=2&clientMessageId=voice-1";

    const first = await upload(a.auth, threadId, fakeM4a(), q);
    const retry = await upload(a.auth, threadId, fakeM4a(), q);

    expect(retry.body.id).toBe(first.body.id);
    expect(await MessageModel.countDocuments({ threadId, kind: "voice" })).toBe(1);
    expect(readdirSync(join(VOICE_ROOT, threadId))).toHaveLength(1);
  });

  it("unmatching removes the conversation's audio", async () => {
    const { a, threadId, matchId } = await makeMatchedPair();
    await upload(a.auth, threadId, fakeM4a());
    expect(existsSync(join(VOICE_ROOT, threadId))).toBe(true);

    const res = await request(app).delete(`/v1/matches/${matchId}`).set("authorization", a.auth);
    expect(res.status).toBeLessThan(300);
    expect(existsSync(join(VOICE_ROOT, threadId))).toBe(false);
  });
});
