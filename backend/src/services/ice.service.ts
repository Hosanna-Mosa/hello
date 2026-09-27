/**
 * ICE servers for a WebRTC call.
 *
 * STUN alone gets two phones connected most of the time. TURN is what covers
 * the rest: a symmetric or carrier-grade NAT will not let peers reach each
 * other directly, and on mobile data that is common enough that "calls work
 * for me" and "calls never connect for my friend" are the same build.
 *
 * TURN CREDENTIALS ARE MINTED PER REQUEST AND EXPIRE. The long-lived shared
 * secret stays on this server and is never sent anywhere. Putting a static
 * TURN username and password in the app would publish them to everyone who
 * installs it — an open relay anybody can push traffic through, billed to us.
 *
 * This is coturn's standard REST scheme (`use-auth-secret`): the username is
 * `<unix-expiry>:<userId>` and the password is base64(HMAC-SHA1(secret,
 * username)). coturn recomputes the same HMAC and needs no user database.
 */

import { createHmac } from "node:crypto";

import { env } from "@/config/env.js";

export type IceServer = {
  urls: string[];
  username?: string;
  credential?: string;
};

export function iceServersFor(userId: string): IceServer[] {
  const servers: IceServer[] = [
    { urls: env.STUN_URLS.split(",").map((u) => u.trim()).filter(Boolean) },
  ];

  // TURN is optional in development — a laptop and an emulator on one machine
  // never need a relay, and requiring it would make the whole feature
  // undevelopable without infrastructure.
  if (!env.TURN_URLS || !env.TURN_SECRET) return servers;

  const expiry = Math.floor(Date.now() / 1000) + env.TURN_TTL_SEC;
  const username = `${expiry}:${userId}`;
  const credential = createHmac("sha1", env.TURN_SECRET).update(username).digest("base64");

  servers.push({
    urls: env.TURN_URLS.split(",").map((u) => u.trim()).filter(Boolean),
    username,
    credential,
  });

  return servers;
}
