/**
 * The live connection.
 *
 * Only in real mode: with `EXPO_PUBLIC_API=mock` there is no server to connect
 * to, and every function here is a no-op. That keeps the mock path — and the
 * 482 tests that run on it — completely unaware that sockets exist.
 *
 * The token goes in `auth`, never the query string. A query string ends up in
 * proxy access logs and error reports, and an access token in either is a leak
 * TLS does not prevent.
 *
 * Nothing here is a source of truth. Every event mirrors something already
 * written in MongoDB, so a dropped connection costs freshness, not data — the
 * screens still reload on focus.
 */

import { io, type Socket } from "socket.io-client";

import { apiBaseUrl, getAccessToken, isMockMode } from "./client";
import type { Message } from "./types";

export type SocketEvents = {
  "message:new": { threadId: string; message: Message };
  "message:reaction": { threadId: string; messageId: string; reactions: Message["reactions"] };
  "thread:receipt": { threadId: string; userId: string; readAt?: string; deliveredAt?: string };
  "match:new": { match: unknown; thread: unknown };
  "request:new": { request: unknown };
  "thread:ended": { threadId: string; matchId: string };
  "call:incoming": { call: unknown; fromUserId: string };
  "call:accepted": { callId: string };
  /**
   * One WebRTC signalling message from the other person.
   *
   * `data` is SDP or an ICE candidate and is deliberately untyped here — the
   * server relays it without parsing, and so does this layer. `webrtc.ts` is
   * the only place that knows what is inside.
   */
  "call:signal": { callId: string; kind: "offer" | "answer" | "ice"; data: unknown; fromUserId: string };
  "call:ended": { call: unknown; systemMessage?: Message };
};

let socket: Socket | null = null;

type AnyHandler = (payload: never) => void;

/**
 * Handlers, kept independently of the connection.
 *
 * THE STORES SUBSCRIBE AT MODULE LOAD — `chat.store.ts` calls `onSocket` at
 * its top level — and that happens long before sign-in creates the socket.
 * An earlier version bound straight to `socket` and returned a no-op when it
 * was null, so every one of those subscriptions was silently dropped and the
 * socket connected with nothing listening: messages, reactions, receipts and
 * unmatches all arrived on the wire and went nowhere. The symptom was a chat
 * that only updated when you left and reopened it, because that refetches
 * over HTTP.
 *
 * So subscriptions live here, and the connection binds to THEM.
 */
const handlers = new Map<string, Set<AnyHandler>>();

function bindAll(next: Socket): void {
  for (const [event, set] of handlers) {
    for (const handler of set) next.on(event, handler as (p: unknown) => void);
  }
}

export function connectSocket(): void {
  if (isMockMode() || socket) return;

  const token = getAccessToken();
  if (!token) return;

  socket = io(apiBaseUrl(), {
    auth: { token },
    transports: ["websocket"],
    // A phone loses its connection constantly. Reconnect, but back off rather
    // than hammering a server that may be down.
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

  // Everything that subscribed before now. socket.io keeps listeners across
  // its own reconnects, so this is needed once per connection, not per drop.
  bindAll(socket);
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * Subscribe to a server event. Returns an unsubscribe.
 *
 * Works whether or not the socket exists yet — see `handlers` above. In mock
 * mode the subscription is simply never bound to anything, because nothing
 * ever connects.
 */
export function onSocket<K extends keyof SocketEvents>(
  event: K,
  handler: (payload: SocketEvents[K]) => void,
): () => void {
  const key = event as string;
  const set = handlers.get(key) ?? new Set<AnyHandler>();
  set.add(handler as AnyHandler);
  handlers.set(key, set);

  // Already connected — bind now rather than waiting for a reconnect.
  socket?.on(key, handler as (p: unknown) => void);

  return () => {
    handlers.get(key)?.delete(handler as AnyHandler);
    socket?.off(key, handler as (p: unknown) => void);
  };
}

/**
 * Joins a conversation's room so ephemeral signals arrive.
 *
 * Typing is only sent to people actually looking at the thread — sending it to
 * every device someone owns would be noise.
 */
export function subscribeThread(threadId: string): void {
  socket?.emit("thread:subscribe", { threadId });
}

export function unsubscribeThread(threadId: string): void {
  socket?.emit("thread:unsubscribe", { threadId });
}

/**
 * Send one signalling message to the other person on a call.
 *
 * Fire-and-forget: the server acks, but a lost candidate is not worth
 * surfacing — ICE sends many and needs only enough of them to succeed.
 */
export function emitCallSignal(
  callId: string,
  kind: "offer" | "answer" | "ice",
  data: unknown,
): void {
  socket?.emit("call:signal", { callId, kind, data });
}

/** Tell the caller we picked up. Acked, because the UI waits on it. */
export function emitCallAccept(callId: string): void {
  socket?.emit("call:accept", { callId });
}

export function socketConnected(): boolean {
  return socket?.connected ?? false;
}
