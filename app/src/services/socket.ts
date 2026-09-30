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

import { AppState, type NativeEventSubscription } from "react-native";
import { io, type Socket } from "socket.io-client";

import { apiBaseUrl, getAccessToken, isMockMode, validAccessToken } from "./client";
import type { Message, SupportMessage, SupportTicket, SupportTicketDetail } from "./types";

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
  /** A new line in one of your support tickets — from support, or from you on another device. */
  "support:message:new": { ticketId: string; message: SupportMessage };
  /** A ticket's status, preview or unread count changed. */
  "support:ticket:updated": { ticket: SupportTicket };
  /** Support (or you, elsewhere) typing in a ticket you have open. */
  "support:typing": { ticketId: string; author: "user" | "admin"; isTyping: boolean };
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

/** Retry state for a handshake the server refused (see `connect_error`). */
let refusedRetry: ReturnType<typeof setTimeout> | null = null;
let refusals = 0;
let appState: NativeEventSubscription | null = null;

export function connectSocket(): void {
  if (isMockMode() || socket) return;
  if (!getAccessToken()) return;

  const next = io(apiBaseUrl(), {
    /*
     * A FUNCTION, not `{ token }`. socket.io calls it on every (re)connect, so
     * each handshake carries a token that is valid NOW.
     *
     * The object form sent the sign-in token forever. Access tokens live 15
     * minutes, so any reconnect after that — the screen locked, wifi to mobile
     * data, the app backgrounded — was refused by the server's auth check, and
     * socket.io does not retry a refused handshake on its own. The phone then
     * stayed deaf until restarted: no ringing, no call signalling, no live chat.
     */
    auth: (cb) => {
      void validAccessToken().then((token) => cb({ token: token ?? "" }));
    },
    transports: ["websocket"],
    // A phone loses its connection constantly. Reconnect, but back off rather
    // than hammering a server that may be down.
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  socket = next;

  next.on("connect", () => {
    refusals = 0;
  });

  // Refused by the server (`err.data` is set) rather than a network failure:
  // socket.io gives up on these, so try again with a fresh token, backing off.
  next.on("connect_error", (err: Error & { data?: unknown }) => {
    if (!err.data || refusedRetry || socket !== next) return;
    refusals += 1;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(refusals, 5));
    refusedRetry = setTimeout(() => {
      refusedRetry = null;
      if (socket === next && !next.connected && getAccessToken()) next.connect();
    }, delay);
  });

  // Coming back to the app is when a call is most likely to be placed or
  // answered — make sure the line is up, rather than waiting on a backoff.
  appState ??= AppState.addEventListener("change", (state) => {
    if (state === "active" && socket && !socket.connected && getAccessToken()) socket.connect();
  });

  // Everything that subscribed before now. socket.io keeps listeners across
  // its own reconnects, so this is needed once per connection, not per drop.
  bindAll(next);
}

export function disconnectSocket(): void {
  if (refusedRetry) clearTimeout(refusedRetry);
  refusedRetry = null;
  refusals = 0;
  appState?.remove();
  appState = null;
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

/**
 * Report one step of this phone's side of a call to the server log.
 *
 * Calls fail ON THE DEVICE — a microphone that would not open, an offer that
 * could not be applied, ICE that never left "checking" — and none of that is
 * visible to the server otherwise. Fire-and-forget, and never user data: stage
 * names, states and candidate TYPES only.
 */
export function emitCallDiag(callId: string, stage: string, detail?: unknown): void {
  socket?.emit("call:diag", { callId, stage, ...(detail === undefined ? {} : { detail }) });
}

/**
 * Report one step of sending a voice message to the server log — the same idea
 * as `emitCallDiag`. A clip that fails to read on the phone never reaches the
 * upload route, so without this the server has nothing to show. Sizes,
 * durations and error codes only; never the audio.
 */
export function emitVoiceDiag(threadId: string, stage: string, detail?: unknown): void {
  socket?.emit("voice:diag", { threadId, stage, ...(detail === undefined ? {} : { detail }) });
}

/** Tell the caller we picked up. Acked, because the UI waits on it. */
export function emitCallAccept(callId: string): void {
  socket?.emit("call:accept", { callId });
}

export function socketConnected(): boolean {
  return socket?.connected ?? false;
}

// --- support ----------------------------------------------------------------

/** Join a support ticket's room while it is on screen, so typing arrives. */
export function subscribeSupportTicket(ticketId: string): void {
  socket?.emit("support:subscribe", { ticketId });
}

export function unsubscribeSupportTicket(ticketId: string): void {
  socket?.emit("support:unsubscribe", { ticketId });
}

export function emitSupportTyping(ticketId: string, isTyping: boolean): void {
  socket?.emit("support:typing", { ticketId, isTyping });
}

/** How long a socket send may take before the caller falls back to HTTP. */
const SUPPORT_ACK_TIMEOUT_MS = 8000;

type SupportAck = SupportTicketDetail | { error: { code: string; message: string } };

/**
 * Send a support message over the live connection.
 *
 * Resolves with the stored ticket and message(s) — the same body the REST
 * route returns — or `null` when there is no connection or no answer in time,
 * so the caller can retry over HTTP. The `clientMessageId` makes that retry
 * safe: if the socket send did land, the server returns the original rather
 * than storing it twice.
 *
 * A server REFUSAL (the ticket is resolved, the body is empty) rejects with
 * its code, because retrying over HTTP would only be refused again.
 */
export function sendSupportMessageLive(
  ticketId: string,
  body: string,
  clientMessageId: string,
): Promise<SupportTicketDetail | null> {
  const live = socket;
  if (!live?.connected) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    live
      .timeout(SUPPORT_ACK_TIMEOUT_MS)
      .emit("support:message:send", { ticketId, body, clientMessageId }, (err: Error | null, result: SupportAck) => {
        if (err) {
          resolve(null);
          return;
        }
        if ("error" in result) {
          reject(Object.assign(new Error(result.error.message), { code: result.error.code }));
          return;
        }
        resolve(result);
      });
  });
}
