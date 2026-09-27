/**
 * Phase 6: live delivery.
 *
 * Driven with two real socket clients against a real HTTP server, because the
 * things worth testing here are all about one connection seeing what another
 * one did. A mocked emitter would prove nothing.
 */

import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import request from "supertest";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { CallModel } from "@/models/call.model.js";
import { MessageModel } from "@/models/message.model.js";
import { ThreadModel } from "@/models/thread.model.js";
import { UserModel } from "@/models/user.model.js";
import { ANCHOR } from "@/seed/profiles.seed.js";
import { attachSockets, closeSockets } from "@/sockets/io.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
let server: HttpServer;
let port: number;
let counter = 0;
const open: ClientSocket[] = [];

beforeAll(async () => {
  await startTestEnv();
  for (const m of [UserModel, ThreadModel, MessageModel]) await m.syncIndexes();

  server = createServer(app);
  await attachSockets(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await closeSockets();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await stopTestEnv();
});

beforeEach(wipe);

/**
 * Wait for every socket to actually be gone, not just asked to leave.
 *
 * `disconnect()` returns immediately and the server tears the session down
 * later. The next test's `wipe()` then deletes the users out from under a
 * handshake still in flight, the auth middleware finds nobody, and the
 * connection dies as "socket hang up" — in whichever file happens to be
 * running when it lands (PLAN #167).
 */
afterEach(async () => {
  const sockets = open.splice(0);

  await Promise.all(
    sockets.map(
      (s) =>
        new Promise<void>((resolve) => {
          if (!s.connected) {
            s.close();
            resolve();
            return;
          }
          s.once("disconnect", () => resolve());
          s.disconnect();
        }),
    ),
  );
});

async function makeUser(name: string) {
  counter += 1;
  const phoneNumber = String(7730000000 + counter);

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

  return { auth, token: session.body.token as string, id: session.body.userId as string };
}

/** Connects a client, or rejects with whatever the handshake refused with. */
function socketFor(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    // The token goes in `auth`, NEVER the query string — a query string lands
    // in proxy logs.
    const s = connect(`http://127.0.0.1:${port}`, { auth: { token }, transports: ["websocket"], forceNew: true });
    open.push(s);
    s.on("connect", () => resolve(s));
    s.on("connect_error", (err) => reject(err));
  });
}

/** Resolves on the next matching event, or rejects on timeout. */
function nextEvent<T = unknown>(socket: ClientSocket, event: string, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no "${event}" within ${ms}ms`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Asserts an event does NOT arrive. Used for the A18 silence. */
async function noEvent(socket: ClientSocket, event: string, ms = 800): Promise<void> {
  let fired = false;
  socket.once(event, () => {
    fired = true;
  });
  await new Promise((r) => setTimeout(r, ms));
  if (fired) throw new Error(`"${event}" arrived and should not have`);
}

async function makeMatchedPair() {
  const a = await makeUser("Ada");
  const b = await makeUser("Ben");
  await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });
  const matched = await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });
  return { a, b, threadId: matched.body.match.threadId as string };
}

describe("the handshake", () => {
  it("refuses a socket with no token", async () => {
    await expect(socketFor("")).rejects.toThrow();
  });

  it("refuses a token that has been signed out", async () => {
    const user = await makeUser("Gone");
    await request(app).post("/v1/auth/signout").set("authorization", user.auth);

    // A socket that outlives a sign-out is exactly the hole the access
    // denylist exists to close.
    await expect(socketFor(user.token)).rejects.toThrow();
  });

  it("accepts a valid token", async () => {
    const user = await makeUser("Here");
    const socket = await socketFor(user.token);
    expect(socket.connected).toBe(true);
  });
});

describe("live messages", () => {
  it("reaches the other person without them asking", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const socketB = await socketFor(b.token);

    const arrived = nextEvent<{ threadId: string; message: { body: string } }>(socketB, "message:new");

    await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "Fancy a quiz night?" });

    const event = await arrived;
    expect(event.threadId).toBe(threadId);
    expect(event.message.body).toBe("Fancy a quiz night?");
  });

  it("also reaches the sender's OTHER devices", async () => {
    const { a, threadId } = await makeMatchedPair();
    const phone = await socketFor(a.token);
    const tablet = await socketFor(a.token);

    const onPhone = nextEvent(phone, "message:new");
    const onTablet = nextEvent(tablet, "message:new");

    await request(app)
      .post(`/v1/threads/${threadId}/messages`)
      .set("authorization", a.auth)
      .send({ body: "from one device" });

    await expect(Promise.all([onPhone, onTablet])).resolves.toHaveLength(2);
  });

  it("sends over the socket and acks with the stored message", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const socketA = await socketFor(a.token);
    const socketB = await socketFor(b.token);

    const arrived = nextEvent<{ message: { body: string } }>(socketB, "message:new");

    const ack = await new Promise<{ message?: { id: string; status: string } }>((resolve) => {
      socketA.emit("message:send", { threadId, body: "over the wire", clientMessageId: "s1" }, resolve);
    });

    // The ack is what turns an optimistic "sending" into "sent" in one trip.
    expect(ack.message?.id).toBeTruthy();
    expect(ack.message?.status).toBe("sent");
    expect((await arrived).message.body).toBe("over the wire");
  });

  it("will not let a non-participant send into a thread", async () => {
    const { threadId } = await makeMatchedPair();
    const stranger = await makeUser("Interloper");
    const socket = await socketFor(stranger.token);

    const ack = await new Promise<{ error?: { code: string } }>((resolve) => {
      socket.emit("message:send", { threadId, body: "let me in" }, resolve);
    });

    expect(ack.error?.code).toBe("notFound");
    expect(await MessageModel.countDocuments({ threadId })).toBe(0);
  });
});

describe("typing", () => {
  it("reaches someone looking at the thread", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const socketA = await socketFor(a.token);
    const socketB = await socketFor(b.token);

    await new Promise<void>((resolve) => socketB.emit("thread:subscribe", { threadId }, () => resolve()));

    const typing = nextEvent<{ userId: string; isTyping: boolean }>(socketB, "typing");
    socketA.emit("typing:start", { threadId });

    const event = await typing;
    expect(event.userId).toBe(a.id);
    expect(event.isTyping).toBe(true);
  });
});

describe("read receipts", () => {
  it("sends ONE receipt for the whole cursor move", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const socketA = await socketFor(a.token);

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/v1/threads/${threadId}/messages`)
        .set("authorization", a.auth)
        .send({ body: `m${i}` });
    }

    let receipts = 0;
    socketA.on("thread:receipt", () => {
      receipts += 1;
    });

    await request(app).post(`/v1/threads/${threadId}/read`).set("authorization", b.auth);
    await new Promise((r) => setTimeout(r, 600));

    // Five messages read, one event. Not five.
    expect(receipts).toBe(1);
  });
});

describe("A18 — a decline is silent", () => {
  it("emits NOTHING to the sender when their request is declined", async () => {
    const sender = await makeUser("Hopeful");
    const receiver = await makeUser("Decliner");
    const socketSender = await socketFor(sender.token);

    await request(app)
      .post("/v1/likes")
      .set("authorization", sender.auth)
      .send({ toUserId: receiver.id, note: "hello" });

    const inbox = await request(app).get("/v1/requests").set("authorization", receiver.auth);
    await request(app)
      .post(`/v1/requests/${inbox.body[0].id}/decline`)
      .set("authorization", receiver.auth);

    // There is no decline event and there never will be. The requirement is
    // enforced by the absence of a channel, so this asserts the silence.
    await noEvent(socketSender, "request:declined");
    await noEvent(socketSender, "thread:ended");
    await noEvent(socketSender, "match:new");
  });

  it("DOES notify the recipient of a new request", async () => {
    const sender = await makeUser("Asker");
    const receiver = await makeUser("Receiver");
    const socketReceiver = await socketFor(receiver.token);

    const arrived = nextEvent(socketReceiver, "request:new");

    await request(app)
      .post("/v1/likes")
      .set("authorization", sender.auth)
      .send({ toUserId: receiver.id, note: "quiz night?" });

    await expect(arrived).resolves.toBeTruthy();
  });
});

describe("matching", () => {
  it("tells both sides live", async () => {
    const a = await makeUser("Mia");
    const b = await makeUser("Max");
    const socketA = await socketFor(a.token);
    const socketB = await socketFor(b.token);

    await request(app).post("/v1/likes").set("authorization", a.auth).send({ toUserId: b.id });

    const onA = nextEvent(socketA, "match:new");
    const onB = nextEvent(socketB, "match:new");

    await request(app).post("/v1/likes").set("authorization", b.auth).send({ toUserId: a.id });

    await expect(Promise.all([onA, onB])).resolves.toHaveLength(2);
  });
});

describe("calls", () => {
  it("rings the other person", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const socketB = await socketFor(b.token);

    const ringing = nextEvent<{ call: { direction: string } }>(socketB, "call:incoming");

    await request(app).post("/v1/calls").set("authorization", a.auth).send({ threadId });

    // The same call is outgoing to the caller and incoming to the callee.
    expect((await ringing).call.direction).toBe("incoming");
  });

  it("writes a system message for a completed call, and none for a declined one", async () => {
    const { a, threadId } = await makeMatchedPair();

    const completed = await request(app).post("/v1/calls").set("authorization", a.auth).send({ threadId });
    await request(app)
      .post(`/v1/calls/${completed.body.id}/end`)
      .set("authorization", a.auth)
      .send({ outcome: "completed", durationSec: 134 });

    const declined = await request(app).post("/v1/calls").set("authorization", a.auth).send({ threadId });
    await request(app)
      .post(`/v1/calls/${declined.body.id}/end`)
      .set("authorization", a.auth)
      .send({ outcome: "declined", durationSec: 0 });

    const system = await MessageModel.find({ threadId, kind: "system" });
    expect(system).toHaveLength(1);
    expect(system[0]!.body).toBe("Voice call · 2:14");
  });

  it("ending twice does not append a second system message", async () => {
    const { a, threadId } = await makeMatchedPair();
    const call = await request(app).post("/v1/calls").set("authorization", a.auth).send({ threadId });

    for (let i = 0; i < 2; i++) {
      await request(app)
        .post(`/v1/calls/${call.body.id}/end`)
        .set("authorization", a.auth)
        .send({ outcome: "completed", durationSec: 60 });
    }

    expect(await MessageModel.countDocuments({ threadId, kind: "system" })).toBe(1);
  });
});

describe("blocking, live", () => {
  /**
   * A block deletes the conversation. Both phones may have it open, so both
   * have to be told in the same request — otherwise the screen stays on a
   * thread that no longer exists and every action on it fails as notFound.
   */
  it("tells BOTH sides the thread ended", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const [socketA, socketB] = await Promise.all([socketFor(a.token), socketFor(b.token)]);

    const endedA = nextEvent<{ threadId: string }>(socketA, "thread:ended");
    const endedB = nextEvent<{ threadId: string }>(socketB, "thread:ended");

    await request(app).post("/v1/blocks").set("authorization", a.auth).send({ userId: b.id });

    expect((await endedA).threadId).toBe(threadId);
    expect((await endedB).threadId).toBe(threadId);
  });

  /**
   * The same must be true when the block arrives as part of a report. The
   * emit lived only on the block route, so reporting-and-blocking left the
   * reported person in a live room for a deleted thread (PLAN #133).
   */
  it("tells both sides when the block came from a report", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const socketB = await socketFor(b.token);

    const ended = nextEvent<{ threadId: string }>(socketB, "thread:ended");

    await request(app)
      .post("/v1/reports")
      .set("authorization", a.auth)
      .send({ reportedUserId: b.id, reason: "romanticAdvance", alsoBlock: true });

    expect((await ended).threadId).toBe(threadId);
  });

  /**
   * `thread:ended` is indistinguishable from an ordinary unmatch, which is
   * what makes it safe to send. Nothing may tell the reported person that a
   * REPORT is why — the same reasoning as A18's missing decline channel.
   */
  it("never tells the reported person they were reported", async () => {
    const { a, b } = await makeMatchedPair();
    const socketB = await socketFor(b.token);

    await request(app)
      .post("/v1/reports")
      .set("authorization", a.auth)
      .send({ reportedUserId: b.id, reason: "harassment", alsoBlock: true });

    for (const event of ["report:new", "report:received", "account:flagged"]) {
      await noEvent(socketB, event);
    }
  });
});

describe("a call that actually connects", () => {
  /**
   * `call:accept` passed the CALL id where the emitter wants a USER id, so the
   * event went to a room nobody was in. The caller sat on a ringing screen
   * forever — invisible only because the app faked "connected" on a 2.2s timer
   * regardless (PLAN #161).
   */
  it("tells the CALLER when the callee picks up", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const [socketA, socketB] = await Promise.all([socketFor(a.token), socketFor(b.token)]);

    const ringing = nextEvent<{ call: { id: string } }>(socketB, "call:incoming");
    socketA.emit("call:invite", { threadId });
    const { call } = await ringing;

    const accepted = nextEvent<{ callId: string }>(socketA, "call:accepted");
    socketB.emit("call:accept", { callId: call.id });

    expect((await accepted).callId).toBe(call.id);
  });

  it("stamps answeredAt, which separates a completed call from a missed one", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const [socketA, socketB] = await Promise.all([socketFor(a.token), socketFor(b.token)]);

    const ringing = nextEvent<{ call: { id: string } }>(socketB, "call:incoming");
    socketA.emit("call:invite", { threadId });
    const { call } = await ringing;

    expect((await CallModel.findById(call.id))?.answeredAt).toBeNull();

    const accepted = nextEvent(socketA, "call:accepted");
    socketB.emit("call:accept", { callId: call.id });
    await accepted;

    expect((await CallModel.findById(call.id))?.answeredAt).not.toBeNull();
  });

  it("refuses an accept from the CALLER — you cannot answer your own call", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const [socketA, socketB] = await Promise.all([socketFor(a.token), socketFor(b.token)]);

    const ringing = nextEvent<{ call: { id: string } }>(socketB, "call:incoming");
    socketA.emit("call:invite", { threadId });
    const { call } = await ringing;

    const refused = await new Promise<{ error?: { code: string } }>((resolve) => {
      socketA.emit("call:accept", { callId: call.id }, resolve);
    });

    expect(refused.error?.code).toBe("notFound");
    expect((await CallModel.findById(call.id))?.answeredAt).toBeNull();
  });
});

describe("WebRTC signalling", () => {
  /**
   * The server relays offer/answer/ICE and understands none of it. What it
   * must enforce is WHO: a guessed call id cannot be used to push media
   * negotiation at a stranger, and a finished call carries nothing.
   */
  it("relays a signal to the other person, untouched", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const [socketA, socketB] = await Promise.all([socketFor(a.token), socketFor(b.token)]);

    const ringing = nextEvent<{ call: { id: string } }>(socketB, "call:incoming");
    socketA.emit("call:invite", { threadId });
    const { call } = await ringing;

    const relayed = nextEvent<{ kind: string; data: unknown; fromUserId: string }>(socketB, "call:signal");
    const sdp = { type: "offer", sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n" };
    socketA.emit("call:signal", { callId: call.id, kind: "offer", data: sdp });

    const got = await relayed;
    expect(got.kind).toBe("offer");
    expect(got.fromUserId).toBe(a.id);
    // Byte-for-byte: the server has no business rewriting SDP.
    expect(got.data).toEqual(sdp);
  });

  it("refuses a signal from someone not on the call", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const stranger = await makeUser("Nosy");
    const [socketA, socketB, socketC] = await Promise.all([
      socketFor(a.token),
      socketFor(b.token),
      socketFor(stranger.token),
    ]);

    const ringing = nextEvent<{ call: { id: string } }>(socketB, "call:incoming");
    socketA.emit("call:invite", { threadId });
    const { call } = await ringing;

    const refused = await new Promise<{ error?: { code: string } }>((resolve) => {
      socketC.emit("call:signal", { callId: call.id, kind: "offer", data: { sdp: "x" } }, resolve);
    });
    expect(refused.error?.code).toBe("notFound");

    // And nothing reached either real participant.
    await noEvent(socketA, "call:signal");
    await noEvent(socketB, "call:signal");
  });

  it("refuses an unknown signal kind rather than relaying it blindly", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const [socketA, socketB] = await Promise.all([socketFor(a.token), socketFor(b.token)]);

    const ringing = nextEvent<{ call: { id: string } }>(socketB, "call:incoming");
    socketA.emit("call:invite", { threadId });
    const { call } = await ringing;

    const refused = await new Promise<{ error?: { code: string } }>((resolve) => {
      socketA.emit("call:signal", { callId: call.id, kind: "whatever", data: {} }, resolve);
    });

    expect(refused.error?.code).toBe("validation");
    await noEvent(socketB, "call:signal");
  });

  it("carries nothing once the call has ended", async () => {
    const { a, b, threadId } = await makeMatchedPair();
    const [socketA, socketB] = await Promise.all([socketFor(a.token), socketFor(b.token)]);

    const ringing = nextEvent<{ call: { id: string } }>(socketB, "call:incoming");
    socketA.emit("call:invite", { threadId });
    const { call } = await ringing;

    await new Promise<void>((resolve) => {
      socketA.emit("call:end", { callId: call.id, outcome: "completed", durationSec: 5 }, () => resolve());
    });

    const refused = await new Promise<{ error?: { code: string } }>((resolve) => {
      socketA.emit("call:signal", { callId: call.id, kind: "ice", data: {} }, resolve);
    });
    expect(refused.error?.code).toBe("notFound");
  });
});
