/**
 * Support tickets — REST on both sides, and live delivery over both sockets.
 *
 * The properties that matter:
 *   - a user sees only their own tickets (someone else's is 404, not 403);
 *   - support can only ASK to resolve; the ticket closes when the user agrees;
 *   - "not yet", or simply writing again, sends it back to open;
 *   - a resolved ticket takes no more messages from either side;
 *   - a retried send never stores twice;
 *   - whatever one side does, the other sees live — and the panel's socket
 *     needs a ticket from a live session, and dies with it.
 */

import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import request from "supertest";
import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { AdminModel } from "@/models/admin.model.js";
import { SupportMessageModel } from "@/models/supportMessage.model.js";
import { SupportTicketModel } from "@/models/supportTicket.model.js";
import { UserModel } from "@/models/user.model.js";
import { ANCHOR } from "@/seed/profiles.seed.js";
import { attachSockets, closeSockets } from "@/sockets/io.js";
import { hashPassword } from "@/utils/password.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
const H = { "x-admin-request": "1" };
const ADMIN_EMAIL = "support@example.com";
const ADMIN_PASSWORD = "correct-horse-battery";

let server: HttpServer;
let port: number;
let counter = 0;
const open: ClientSocket[] = [];

beforeAll(async () => {
  await startTestEnv();
  for (const m of [UserModel, SupportTicketModel, SupportMessageModel]) await m.syncIndexes();
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

beforeEach(async () => {
  await wipe();
  await AdminModel.create({ email: ADMIN_EMAIL, passwordHash: await hashPassword(ADMIN_PASSWORD), name: "Sam" });
});

// Same teardown discipline as sockets.test.ts (PLAN #167): wait until gone.
afterEach(async () => {
  await Promise.all(
    open.splice(0).map(
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

// --- helpers ----------------------------------------------------------------

async function makeUser(name: string) {
  counter += 1;
  const phoneNumber = String(7740000000 + counter);
  const code = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });
  const session = await request(app).post("/v1/auth/verify").send({ countryCode: "44", phoneNumber, code: code.body.devCode });
  const auth = `Bearer ${session.body.token}`;
  await request(app)
    .patch("/v1/me")
    .set("authorization", auth)
    .send({ name, birthday: "1993-03-03", location: { coordinate: { latitude: ANCHOR.latitude, longitude: ANCHOR.longitude } } });
  await request(app).post("/v1/auth/onboarding/complete").set("authorization", auth);
  return { auth, token: session.body.token as string, id: session.body.userId as string };
}

async function adminCookie(): Promise<string> {
  const res = await request(app).post("/v1/admin/auth/login").set(H).send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(res.status).toBe(200);
  return ([res.headers["set-cookie"]].flat()[0] as string).split(";")[0] as string;
}

const admin = (cookie: string) => ({
  get: (path: string) => request(app).get(`/v1/admin${path}`).set(H).set("cookie", cookie),
  post: (path: string, body: object = {}) => request(app).post(`/v1/admin${path}`).set(H).set("cookie", cookie).send(body),
});

async function openTicket(auth: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/v1/support/tickets")
    .set("authorization", auth)
    .send({ subject: "Can't change my interests", category: "technical", message: "The save button does nothing.", ...overrides });
  expect(res.status).toBe(201);
  return res.body as { ticket: { id: string; status: string }; messages: { id: string; body: string }[] };
}

function userSocket(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const s = connect(`http://127.0.0.1:${port}`, { auth: { token }, transports: ["websocket"], forceNew: true });
    open.push(s);
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
}

function adminSocket(ticket: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const s = connect(`http://127.0.0.1:${port}/admin`, { auth: { token: ticket }, transports: ["websocket"], forceNew: true });
    open.push(s);
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
}

function nextEvent<T = unknown>(socket: ClientSocket, event: string, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no "${event}" within ${ms}ms`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

const ack = <T = Record<string, unknown>>(socket: ClientSocket, event: string, payload: object) =>
  new Promise<T>((resolve) => socket.emit(event, payload, (result: T) => resolve(result)));

// --- the user's side ---------------------------------------------------------

describe("support — the user's side", () => {
  it("opens a ticket with its first message and lists it", async () => {
    const u = await makeUser("Ada");
    const { ticket, messages } = await openTicket(u.auth);

    expect(ticket.status).toBe("open");
    expect(messages).toHaveLength(1);
    expect(messages[0]?.body).toBe("The save button does nothing.");

    const list = await request(app).get("/v1/support/tickets").set("authorization", u.auth);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].lastMessagePreview).toBe("The save button does nothing.");
    expect(list.body[0].lastMessageAuthor).toBe("user");
  });

  it("lets a user open as many tickets as they need", async () => {
    const u = await makeUser("Ada");
    await openTicket(u.auth);
    await openTicket(u.auth, { subject: "Billing question", category: "billing" });
    const list = await request(app).get("/v1/support/tickets").set("authorization", u.auth);
    expect(list.body).toHaveLength(2);
  });

  it("hides one user's ticket from another — 404, not 403", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");
    const { ticket } = await openTicket(a.auth);

    expect((await request(app).get(`/v1/support/tickets/${ticket.id}`).set("authorization", b.auth)).status).toBe(404);
    const send = await request(app).post(`/v1/support/tickets/${ticket.id}/messages`).set("authorization", b.auth).send({ body: "hi" });
    expect(send.status).toBe(404);
    expect((await request(app).get("/v1/support/tickets").set("authorization", b.auth)).body).toHaveLength(0);
  });

  it("refuses a ticket without a subject, and a blank message", async () => {
    const u = await makeUser("Ada");
    const noSubject = await request(app)
      .post("/v1/support/tickets")
      .set("authorization", u.auth)
      .send({ subject: "", category: "technical", message: "x" });
    expect(noSubject.status).toBe(400);

    const { ticket } = await openTicket(u.auth);
    const blank = await request(app).post(`/v1/support/tickets/${ticket.id}/messages`).set("authorization", u.auth).send({ body: "   " });
    expect(blank.status).toBe(400);
  });

  it("stores a retried send once", async () => {
    const u = await makeUser("Ada");
    const { ticket } = await openTicket(u.auth);
    const send = () =>
      request(app)
        .post(`/v1/support/tickets/${ticket.id}/messages`)
        .set("authorization", u.auth)
        .send({ body: "Still broken", clientMessageId: "retry-1" });

    const first = await send();
    const second = await send();
    expect(second.body.messages[0].id).toBe(first.body.messages[0].id);
    expect(await SupportMessageModel.countDocuments({ ticketId: ticket.id })).toBe(2);
  });

  it("requires sign-in", async () => {
    expect((await request(app).get("/v1/support/tickets")).status).toBe(401);
  });
});

// --- the lifecycle ------------------------------------------------------------

describe("support — resolving", () => {
  it("support asks, the user agrees, the ticket closes — and takes no more messages", async () => {
    const u = await makeUser("Ada");
    const cookie = await adminCookie();
    const { ticket } = await openTicket(u.auth);

    const reply = await admin(cookie).post(`/support/tickets/${ticket.id}/messages`, { body: "Fixed on our side — try again?" });
    expect(reply.status).toBe(200);
    expect(reply.body.messages[0].author).toBe("admin");
    expect(reply.body.messages[0].adminId).toBeTruthy();

    const asked = await admin(cookie).post(`/support/tickets/${ticket.id}/resolve`);
    expect(asked.body.ticket.status).toBe("pendingResolution");
    expect(asked.body.messages[0].event).toBe("resolutionRequested");

    // The user's view: pending, with an unread count, and no operator id leaked.
    const mine = await request(app).get(`/v1/support/tickets/${ticket.id}`).set("authorization", u.auth);
    expect(mine.body.ticket.status).toBe("pendingResolution");
    expect(JSON.stringify(mine.body)).not.toMatch(/adminId/);

    const yes = await request(app).post(`/v1/support/tickets/${ticket.id}/resolution`).set("authorization", u.auth).send({ accept: true });
    expect(yes.body.ticket.status).toBe("resolved");
    expect(yes.body.ticket.resolvedAt).toBeTruthy();
    expect(yes.body.messages[0].event).toBe("resolutionAccepted");

    const userAfter = await request(app).post(`/v1/support/tickets/${ticket.id}/messages`).set("authorization", u.auth).send({ body: "one more thing" });
    expect(userAfter.status).toBe(400);
    const adminAfter = await admin(cookie).post(`/support/tickets/${ticket.id}/messages`, { body: "anything else?" });
    expect(adminAfter.status).toBe(400);
  });

  it("'not yet' sends it back to open", async () => {
    const u = await makeUser("Ada");
    const cookie = await adminCookie();
    const { ticket } = await openTicket(u.auth);
    await admin(cookie).post(`/support/tickets/${ticket.id}/resolve`);

    const no = await request(app).post(`/v1/support/tickets/${ticket.id}/resolution`).set("authorization", u.auth).send({ accept: false });
    expect(no.body.ticket.status).toBe("open");
    expect(no.body.ticket.resolutionRequestedAt).toBeNull();
    expect(no.body.messages[0].event).toBe("resolutionDeclined");

    // Support can ask again.
    expect((await admin(cookie).post(`/support/tickets/${ticket.id}/resolve`)).body.ticket.status).toBe("pendingResolution");
  });

  it("writing while support waits for an answer counts as 'not yet'", async () => {
    const u = await makeUser("Ada");
    const cookie = await adminCookie();
    const { ticket } = await openTicket(u.auth);
    await admin(cookie).post(`/support/tickets/${ticket.id}/resolve`);

    const said = await request(app)
      .post(`/v1/support/tickets/${ticket.id}/messages`)
      .set("authorization", u.auth)
      .send({ body: "It's still happening" });
    expect(said.body.ticket.status).toBe("open");
    expect(said.body.messages.map((m: { author: string }) => m.author)).toEqual(["user", "system"]);
    expect(said.body.messages[1].event).toBe("resolutionDeclined");
  });

  it("only support can ask to resolve; a user cannot confirm what was never asked", async () => {
    const u = await makeUser("Ada");
    const { ticket } = await openTicket(u.auth);
    const res = await request(app).post(`/v1/support/tickets/${ticket.id}/resolution`).set("authorization", u.auth).send({ accept: true });
    expect(res.status).toBe(400);
    expect((await SupportTicketModel.findById(ticket.id))?.status).toBe("open");
  });

  it("answering twice is a no-op, not an error", async () => {
    const u = await makeUser("Ada");
    const cookie = await adminCookie();
    const { ticket } = await openTicket(u.auth);
    await admin(cookie).post(`/support/tickets/${ticket.id}/resolve`);
    const answer = () => request(app).post(`/v1/support/tickets/${ticket.id}/resolution`).set("authorization", u.auth).send({ accept: true });

    expect((await answer()).status).toBe(200);
    const again = await answer();
    expect(again.status).toBe(200);
    expect(again.body.messages).toHaveLength(0);
  });
});

// --- the panel ----------------------------------------------------------------

describe("support — the admin panel", () => {
  it("lists, filters and searches the queue, with who raised each ticket", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");
    await openTicket(a.auth);
    const { ticket: bens } = await openTicket(b.auth, { subject: "Billing question", category: "billing" });
    const cookie = await adminCookie();
    await admin(cookie).post(`/support/tickets/${bens.id}/resolve`);

    const all = await admin(cookie).get("/support/tickets");
    expect(all.body.total).toBe(2);
    expect(all.body.items[0].user.name).toBeTruthy();

    expect((await admin(cookie).get("/support/tickets?status=pendingResolution")).body.total).toBe(1);
    expect((await admin(cookie).get("/support/tickets?search=billing")).body.items[0].id).toBe(bens.id);
    expect((await admin(cookie).get("/support/tickets?search=ada")).body.total).toBe(1);

    const summary = await admin(cookie).get("/support/summary");
    expect(summary.body).toMatchObject({ open: 1, pendingResolution: 1, resolved: 0 });
  });

  it("opening a ticket clears the team's unread count", async () => {
    const u = await makeUser("Ada");
    const { ticket } = await openTicket(u.auth);
    const cookie = await adminCookie();

    expect((await admin(cookie).get("/support/tickets")).body.items[0].unreadCount).toBe(1);
    const detail = await admin(cookie).get(`/support/tickets/${ticket.id}`);
    expect(detail.body.messages).toHaveLength(1);
    expect(detail.body.ticket.unreadCount).toBe(0);
  });

  it("is closed to a signed-out panel and answers a bad id with 404", async () => {
    expect((await request(app).get("/v1/admin/support/tickets").set(H)).status).toBe(401);
    const cookie = await adminCookie();
    expect((await admin(cookie).get("/support/tickets/not-an-id")).status).toBe(404);
  });
});

// --- live delivery ------------------------------------------------------------

describe("support — live", () => {
  it("an operator sees a new ticket and the user's messages as they happen", async () => {
    const u = await makeUser("Ada");
    const cookie = await adminCookie();
    const { token } = (await admin(cookie).get("/auth/socket-ticket")).body as { token: string };
    const panel = await adminSocket(token);

    const incoming = nextEvent<{ ticketId: string; message: { body: string } }>(panel, "support:message:new");
    const updated = nextEvent<{ ticket: { user: { name: string }; unreadCount: number } }>(panel, "support:ticket:updated");
    const { ticket } = await openTicket(u.auth);

    expect((await incoming).ticketId).toBe(ticket.id);
    expect((await updated).ticket.user.name).toBe("Ada");
    expect((await updated).ticket.unreadCount).toBe(1);
  });

  it("the user sees support's reply and the resolve request live", async () => {
    const u = await makeUser("Ada");
    const phone = await userSocket(u.token);
    const { ticket } = await openTicket(u.auth);
    const cookie = await adminCookie();

    const reply = nextEvent<{ message: { author: string; body: string } }>(phone, "support:message:new");
    await admin(cookie).post(`/support/tickets/${ticket.id}/messages`, { body: "Looking into it" });
    expect((await reply).message).toMatchObject({ author: "admin", body: "Looking into it" });

    const status = nextEvent<{ ticket: { status: string } }>(phone, "support:ticket:updated");
    await admin(cookie).post(`/support/tickets/${ticket.id}/resolve`);
    expect((await status).ticket.status).toBe("pendingResolution");
  });

  it("both sides can send over the socket, with the stored message in the ack", async () => {
    const u = await makeUser("Ada");
    const { ticket } = await openTicket(u.auth);
    const phone = await userSocket(u.token);
    const cookie = await adminCookie();
    const panel = await adminSocket(((await admin(cookie).get("/auth/socket-ticket")).body as { token: string }).token);

    const seenByPanel = nextEvent<{ message: { body: string } }>(panel, "support:message:new");
    const sent = await ack<{ messages: { body: string; clientMessageId: string }[] }>(phone, "support:message:send", {
      ticketId: ticket.id,
      body: "Sent from the phone",
      clientMessageId: "c-1",
    });
    expect(sent.messages[0]).toMatchObject({ body: "Sent from the phone", clientMessageId: "c-1" });
    expect((await seenByPanel).message.body).toBe("Sent from the phone");

    const seenByPhone = nextEvent<{ message: { author: string } }>(phone, "support:message:new");
    const answered = await ack<{ messages: { author: string }[] }>(panel, "support:message:send", { ticketId: ticket.id, body: "Got it" });
    expect(answered.messages[0]?.author).toBe("admin");
    expect((await seenByPhone).message.author).toBe("admin");
  });

  it("relays typing between the two people looking at the ticket", async () => {
    const u = await makeUser("Ada");
    const { ticket } = await openTicket(u.auth);
    const phone = await userSocket(u.token);
    const cookie = await adminCookie();
    const panel = await adminSocket(((await admin(cookie).get("/auth/socket-ticket")).body as { token: string }).token);

    expect(await ack(phone, "support:subscribe", { ticketId: ticket.id })).toEqual({ ok: true });
    expect(await ack(panel, "support:subscribe", { ticketId: ticket.id })).toEqual({ ok: true });

    const typing = nextEvent<{ author: string; isTyping: boolean }>(phone, "support:typing");
    panel.emit("support:typing", { ticketId: ticket.id, isTyping: true });
    expect(await typing).toMatchObject({ author: "admin", isTyping: true });
  });

  it("will not let a user subscribe to someone else's ticket", async () => {
    const a = await makeUser("Ada");
    const b = await makeUser("Ben");
    const { ticket } = await openTicket(a.auth);
    const bens = await userSocket(b.token);
    const res = await ack<{ error?: { code: string } }>(bens, "support:subscribe", { ticketId: ticket.id });
    expect(res.error?.code).toBe("notFound");
  });

  it("the panel socket refuses an app token and a forged ticket", async () => {
    const u = await makeUser("Ada");
    await expect(adminSocket(u.token)).rejects.toThrow();
    await expect(adminSocket("eyJhbGciOiJIUzI1NiJ9.e30.x")).rejects.toThrow();
  });

  it("the panel socket is closed when its session signs out", async () => {
    const cookie = await adminCookie();
    const panel = await adminSocket(((await admin(cookie).get("/auth/socket-ticket")).body as { token: string }).token);
    const gone = nextEvent(panel, "disconnect");
    await admin(cookie).post("/auth/logout");
    await gone;
    expect(panel.connected).toBe(false);
  });
});
