/**
 * Be the other person.
 *
 * Testing live delivery needs two accounts, and most people have one phone.
 * This script is the second one: it signs up, matches with you, then sends
 * messages, types, reads and calls on command — so you can watch your phone
 * react to someone who is not you.
 *
 * The partner's session is kept in a scratch file so each command stands
 * alone. `reset` clears it.
 *
 *   npm run partner match 7700900123    # your number, exactly as typed in the app
 *   npm run partner say "hello there"
 *   npm run partner typing
 *   npm run partner read
 *   npm run partner call
 *   npm run partner unmatch
 *   npm run partner reset
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { io } from "socket.io-client";

import { env } from "@/config/env.js";

const BASE = `http://127.0.0.1:${env.PORT}`;
const STATE = join(process.cwd(), ".partner.json");

type State = {
  token: string;
  refreshToken: string;
  userId: string;
  phone: string;
  threadId?: string | undefined;
};

const load = (): State | null => (existsSync(STATE) ? (JSON.parse(readFileSync(STATE, "utf8")) as State) : null);
const save = (s: State): void => writeFileSync(STATE, JSON.stringify(s, null, 2));

async function api(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {},
  // Deliberately `any`: this is a throwaway driver for manual testing, and
  // every call site reads a different field off the response. Typing each one
  // would be more contract maintenance than the script is worth — the real
  // shapes are asserted in `tests/`, against the same endpoints.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const res = await fetch(`${BASE}/v1${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`${opts.method ?? "GET"} ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : await res.json();
}

/** Signs the partner up once, then reuses them. */
async function ensurePartner(): Promise<State> {
  const existing = load();

  if (existing) {
    try {
      await api("/me", { token: existing.token });
      return existing;
    } catch {
      // The access token only lasts 15 minutes; rotate rather than re-signup.
      const next = await api("/auth/refresh", {
        method: "POST",
        body: { refreshToken: existing.refreshToken },
      });
      const refreshed: State = { ...existing, token: next.token, refreshToken: next.refreshToken };
      save(refreshed);
      return refreshed;
    }
  }

  const phoneNumber = "9000000042";
  const { devCode } = await api("/auth/code", { method: "POST", body: { countryCode: "44", phoneNumber } });
  const session = await api("/auth/verify", {
    method: "POST",
    body: { countryCode: "44", phoneNumber, code: devCode },
  });

  await api("/me", {
    method: "PATCH",
    token: session.token,
    body: {
      name: "Partner",
      birthday: "1994-04-04",
      bio: "The other person, for testing.",
      // The seed anchor, so you are inside each other's radius.
      location: { coordinate: { latitude: env.SEED_ANCHOR_LAT, longitude: env.SEED_ANCHOR_LNG } },
    },
  });
  await api("/auth/onboarding/complete", { method: "POST", token: session.token });

  const state: State = {
    token: session.token,
    refreshToken: session.refreshToken,
    userId: session.userId,
    phone: phoneNumber,
  };
  save(state);
  return state;
}

/**
 * Likes you, so that liking back in the app creates the match.
 *
 * You are resolved from the database by phone, because search is by name and
 * the partner has no other way to find a specific person.
 */
async function match(yourNumber: string): Promise<void> {
  const partner = await ensurePartner();

  const { connectMongo, disconnectMongo } = await import("@/config/mongo.js");
  const { UserModel } = await import("@/models/user.model.js");
  await connectMongo();

  const digits = yourNumber.replace(/\D/g, "");
  const you = await UserModel.findOne({ "phone.national": digits });
  await disconnectMongo();

  if (!you) {
    throw new Error(
      `No account for ${yourNumber}. Sign in on the phone first, and pass the number exactly as you typed it.`,
    );
  }

  await api("/likes", { method: "POST", token: partner.token, body: { toUserId: String(you._id) } });

  process.stdout.write(
    `\n  Partner liked ${you.name || "you"}.\n` +
      `  Now find Partner in the app and like back — you should match instantly.\n\n`,
  );
}

async function threadIdFor(partner: State): Promise<string> {
  if (partner.threadId) return partner.threadId;

  const threads = await api("/threads", { token: partner.token });
  if (!threads.length) {
    throw new Error("No thread yet. Run `match` first, then like Partner back in the app.");
  }

  const id = threads[0].id as string;
  save({ ...partner, threadId: id });
  return id;
}

async function say(text: string): Promise<void> {
  const partner = await ensurePartner();
  const id = await threadIdFor(partner);

  await api(`/threads/${id}/messages`, { method: "POST", token: partner.token, body: { body: text } });
  process.stdout.write(`\n  Partner said: "${text}"\n  Your phone should show it WITHOUT a refresh.\n\n`);
}

async function typing(): Promise<void> {
  const partner = await ensurePartner();
  const id = await threadIdFor(partner);

  const socket = io(BASE, { auth: { token: partner.token }, transports: ["websocket"] });
  await new Promise<void>((resolve, reject) => {
    socket.on("connect", () => resolve());
    socket.on("connect_error", reject);
  });

  socket.emit("thread:subscribe", { threadId: id });
  socket.emit("typing:start", { threadId: id });
  process.stdout.write("\n  Partner is typing… (5 seconds)\n  Have the thread open on your phone.\n\n");

  await new Promise((r) => setTimeout(r, 5000));
  socket.emit("typing:stop", { threadId: id });
  socket.disconnect();
}

async function read(): Promise<void> {
  const partner = await ensurePartner();
  const id = await threadIdFor(partner);

  await api(`/threads/${id}/read`, { method: "POST", token: partner.token });
  process.stdout.write("\n  Partner read the thread. Your last message should turn 'read'.\n\n");
}

async function call(): Promise<void> {
  const partner = await ensurePartner();
  const id = await threadIdFor(partner);

  const started = await api("/calls", { method: "POST", token: partner.token, body: { threadId: id } });
  process.stdout.write("\n  Partner is calling. Ending in 8 seconds with a 2:14 duration…\n");

  await new Promise((r) => setTimeout(r, 8000));
  await api(`/calls/${started.id}/end`, {
    method: "POST",
    token: partner.token,
    body: { outcome: "completed", durationSec: 134 },
  });

  process.stdout.write("  Ended. The thread should now show 'Voice call · 2:14'.\n\n");
}

async function unmatch(): Promise<void> {
  const partner = await ensurePartner();
  const matches = await api("/matches", { token: partner.token });
  if (!matches.length) throw new Error("No match to end.");

  await api(`/matches/${matches[0].id}`, { method: "DELETE", token: partner.token });
  save({ ...partner, threadId: undefined });
  process.stdout.write("\n  Partner unmatched. The thread should disappear from your phone.\n\n");
}

const USAGE =
  "\n  npm run partner match <your-number>\n" +
  '  npm run partner say "text"\n' +
  "  npm run partner typing\n" +
  "  npm run partner read\n" +
  "  npm run partner call\n" +
  "  npm run partner unmatch\n" +
  "  npm run partner reset\n\n";

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  try {
    switch (command) {
      case "match":
        if (!rest[0]) throw new Error("Pass your number: npm run partner match 7700900123");
        await match(rest[0]);
        break;
      case "say":
        await say(rest.join(" ") || "Hello from the other side");
        break;
      case "typing":
        await typing();
        break;
      case "read":
        await read();
        break;
      case "call":
        await call();
        break;
      case "unmatch":
        await unmatch();
        break;
      case "reset":
        rmSync(STATE, { force: true });
        process.stdout.write("\n  Partner state cleared.\n\n");
        break;
      default:
        process.stdout.write(USAGE);
    }
    process.exit(0);
  } catch (e) {
    process.stderr.write(`\n  ${(e as Error).message}\n\n`);
    process.exit(1);
  }
}

void main();
