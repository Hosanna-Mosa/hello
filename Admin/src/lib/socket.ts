/**
 * The panel's live connection — Socket.IO namespace `/admin`.
 *
 * AUTH. Not the session cookie: it is HttpOnly and scoped to `/v1/admin`, and
 * the handshake goes to `/socket.io`. Instead every (re)connect first asks
 * `/auth/socket-ticket` — which the cookie DOES authorise — for a one-minute
 * ticket, and presents that. If the session has ended, that request 401s, the
 * API layer's unauthorized handler signs the operator out, and the socket is
 * closed with it.
 *
 * One connection for the whole panel, opened by the signed-in shell and closed
 * on sign-out. Pages subscribe through `useSocketEvent`.
 */

import { io, type Socket } from "socket.io-client";

import { authService } from "@/services/admin.service";

const ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export type SocketStatus = "connecting" | "live" | "offline";

let socket: Socket | null = null;
let status: SocketStatus = "offline";
const statusListeners = new Set<(s: SocketStatus) => void>();
let refusedRetry: ReturnType<typeof setTimeout> | null = null;

type Handler = (payload: never) => void;

/**
 * Subscriptions, kept independently of any one connection.
 *
 * Binding a page's listener straight onto "the socket" lost every event in
 * development: StrictMode mounts, unmounts and remounts the shell, which
 * creates a socket, drops it and creates another — and the page had already
 * bound to the one that was dropped. Events arrived on the wire and nothing
 * heard them. Listeners live here instead, and every new connection binds to
 * all of them (the same design as the app's `services/socket.ts`).
 */
const handlers = new Map<string, Set<Handler>>();

function bindAll(target: Socket): void {
  for (const [event, set] of handlers) for (const handler of set) target.on(event, handler as (p: unknown) => void);
}

/** Subscribe to a server event, whether or not a connection exists yet. Returns an unsubscribe. */
export function onAdminEvent<T>(event: string, handler: (payload: T) => void): () => void {
  const set = handlers.get(event) ?? new Set<Handler>();
  set.add(handler as Handler);
  handlers.set(event, set);
  socket?.on(event, handler as (p: unknown) => void);
  return () => {
    handlers.get(event)?.delete(handler as Handler);
    socket?.off(event, handler as (p: unknown) => void);
  };
}

/** Emit on the live connection, whichever it is right now. */
export function emitAdmin(event: string, payload: unknown): void {
  socket?.emit(event, payload);
}

function setStatus(next: SocketStatus): void {
  status = next;
  for (const listener of statusListeners) listener(next);
}

export function connectAdminSocket(): Socket {
  if (socket) return socket;

  const next = io(`${ORIGIN}/admin`, {
    // A function, so every reconnect carries a FRESH ticket — a ticket lasts a
    // minute, and a reconnect after a laptop sleeps is much later than that.
    auth: (cb) => {
      authService
        .socketTicket()
        .then(({ token }) => cb({ token }))
        .catch(() => cb({ token: "" }));
    },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    // Never reuse a cached manager: a connection closed by sign-out (or by
    // StrictMode's remount) must not come back as the "new" one.
    forceNew: true,
  });
  socket = next;
  setStatus("connecting");
  bindAll(next);

  next.on("connect", () => setStatus("live"));
  next.on("disconnect", () => setStatus(socket === next ? "connecting" : "offline"));
  next.io.on("reconnect_attempt", () => setStatus("connecting"));

  // Socket.IO does not retry a handshake the SERVER refused. Try again with a
  // fresh ticket after a pause — unless the session is gone, in which case the
  // ticket request 401s and sign-out closes this socket first.
  next.on("connect_error", (err: Error & { data?: unknown }) => {
    setStatus("offline");
    if (!err.data || refusedRetry || socket !== next) return;
    refusedRetry = setTimeout(() => {
      refusedRetry = null;
      if (socket === next && !next.connected) next.connect();
    }, 5000);
  });

  return next;
}

export function disconnectAdminSocket(): void {
  if (refusedRetry) clearTimeout(refusedRetry);
  refusedRetry = null;
  socket?.disconnect();
  socket = null;
  setStatus("offline");
}

export function getAdminSocket(): Socket | null {
  return socket;
}

export function socketStatus(): SocketStatus {
  return status;
}

export function onSocketStatus(listener: (s: SocketStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}
