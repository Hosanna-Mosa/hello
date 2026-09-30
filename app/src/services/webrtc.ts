/**
 * The audio half of a voice call.
 *
 * Everything else about a call was already real — `POST /calls`, the ring over
 * the socket, the record, the "Voice call · 2:14" system message. What was
 * missing was sound: the screens connected after a 2.2 second timer and mute
 * had nothing to mute (A17, now superseded).
 *
 * WHAT GOES WHERE. Signalling — the offer, the answer, the ICE candidates —
 * travels over the Socket.IO connection that already exists, relayed by a
 * server that never parses it. The AUDIO does not: it flows directly between
 * the two phones, or through a TURN relay when a carrier NAT refuses to let
 * them meet. No voice data passes through our server.
 *
 * WHO OFFERS. The caller. Both sides run the same code, and `polite` decides
 * who yields if both somehow negotiate at once — with one offer per call that
 * cannot happen today, but the asymmetry is what stops a glare from deadlocking
 * if it ever does.
 *
 * THE MICROPHONE PERMISSION IS OURS TO ASK FOR. `react-native-webrtc` does not
 * request runtime permissions — not one of its twenty Android source files
 * mentions `RECORD_AUDIO` — and a manifest entry alone grants nothing on
 * Android 6+. Without the prompt `getUserMedia` throws, `startCallMedia`
 * returns false and the call ends the instant it is answered: you would see the
 * phone ring, accept, and watch it die (PLAN #196).
 *
 * AUDIO ROUTING is `services/callAudio.ts` (a local native module, no new
 * dependency): call mode, volume keys on the call stream, speaker ↔ earpiece.
 *
 * NOT HANDLED YET, deliberately:
 *   - Ringing a closed or locked app. That needs push and a native call
 *     screen; this connects two apps that are both open.
 */

import { PermissionsAndroid, Platform } from "react-native";

import type { MediaStream, RTCIceCandidate, RTCPeerConnection } from "react-native-webrtc";

import { http, isMockMode } from "./client";
import { emitCallDiag, emitCallSignal } from "./socket";

type IceServer = { urls: string[]; username?: string; credential?: string };

/**
 * A call's live media, or null when there is none.
 *
 * Module-level because exactly one call can be in progress: the screens are
 * full-screen modals and the product has no call waiting.
 */
type Session = {
  callId: string;
  pc: RTCPeerConnection;
  localStream: MediaStream;
  /**
   * Candidates that arrived before the remote description did.
   *
   * `addIceCandidate` throws without a remote description, and the other side
   * starts sending candidates the moment it sets its local one — so on a fast
   * connection they routinely arrive first. Dropping them is how a call
   * connects on wifi and silently fails on mobile data.
   */
  pendingIce: RTCIceCandidate[];
  onConnected?: (() => void) | undefined;
  onFailed?: (() => void) | undefined;
  /** Re-sends the caller's offer until an answer arrives. */
  offerRetry: ReturnType<typeof setInterval> | null;
  /** For the "couldn't connect" diagnosis: which route types each side found. */
  localTypes: Set<string>;
  remoteTypes: Set<string>;
  hadTurn: boolean;
  lastIceState: string;
};

let session: Session | null = null;

type SignalPayload = { callId: string; kind: "offer" | "answer" | "ice"; data: unknown };

/**
 * Signals that arrived before this phone's connection for that call existed.
 *
 * Replayed the moment it does. Without this a message that wins the race — an
 * offer reaching a phone still showing the microphone prompt, or a phone on an
 * older build that accepts before it is ready — is simply dropped, and the call
 * sits on "Connecting…" forever with nothing to say why.
 */
const early = new Map<string, { at: number; items: SignalPayload[] }>();
const EARLY_TTL_MS = 60_000;

function buffer(payload: SignalPayload): void {
  const now = Date.now();
  for (const [id, entry] of early) if (now - entry.at > EARLY_TTL_MS) early.delete(id);
  const entry = early.get(payload.callId) ?? { at: now, items: [] };
  if (entry.items.length < 100) early.set(payload.callId, { at: entry.at, items: [...entry.items, payload] });
}

/** `candidate:… typ relay …` → "relay". */
function candidateType(candidate: unknown): string | null {
  const text = (candidate as { candidate?: string } | null)?.candidate ?? "";
  return / typ (\w+)/.exec(text)?.[1] ?? null;
}

/** An error as a short string for the call log. */
function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Mock mode has no server to fetch from and no media to negotiate. */
/**
 * `react-native-webrtc`, loaded on first use — never at import time.
 *
 * The package throws the moment it is imported if its native half is missing:
 * in Expo Go, or in a dev build made before WebRTC (or before an SDK change).
 * A static import made that crash take down everything that imports this file
 * — the call store, and through it the session store — so the whole app
 * red-boxed at launch over a feature nobody was using yet (PLAN #240).
 *
 * Loaded lazily and guarded, a build without WebRTC just cannot place or take
 * calls: `startCallMedia` returns false and the call screen says it could not
 * start. Everything else keeps working.
 */
type WebRTCModule = typeof import("react-native-webrtc");
let webrtcModule: WebRTCModule | null | undefined;

function webrtc(): WebRTCModule | null {
  if (webrtcModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      webrtcModule = require("react-native-webrtc") as WebRTCModule;
    } catch {
      webrtcModule = null;
    }
  }
  return webrtcModule;
}

/** The loaded module. Only called after `unavailable()` has returned false. */
function lib(): WebRTCModule {
  const loaded = webrtc();
  if (!loaded) throw new Error("WebRTC is not available in this build.");
  return loaded;
}

/** Whether this build can make real calls — false in Expo Go or an outdated build. */
export function callingSupported(): boolean {
  return webrtc() !== null;
}

function unavailable(): boolean {
  return isMockMode() || !callingSupported();
}

async function iceServers(callId: string): Promise<IceServer[]> {
  try {
    const res = await http<{ iceServers: IceServer[] }>("GET", "/calls/ice");
    return res.iceServers;
  } catch (e) {
    emitCallDiag(callId, "ice-servers fetch FAILED — public STUN only, no relay", errorText(e));
    // A public STUN server is a usable fallback: it covers the common NATs.
    // What is lost is TURN, so a call behind a carrier-grade NAT will fail to
    // connect rather than fail to start — which is the better of the two.
    return [{ urls: ["stun:stun.l.google.com:19302"] }];
  }
}

function attach(pc: RTCPeerConnection, callId: string): void {
  // The `on*` properties, not `addEventListener`: react-native-webrtc's
  // typings only describe these, and a call that typechecks against the
  // library it uses is worth more than matching the browser idiom.
  pc.onicecandidate = (event: unknown) => {
    // A null candidate means gathering finished — there is nothing to send.
    const { candidate } = event as { candidate: RTCIceCandidate | null };
    if (!candidate) {
      emitCallDiag(callId, "ice gathering complete", {
        localTypes: session?.pc === pc ? [...session.localTypes] : [],
      });
      return;
    }
    const type = candidateType(candidate);
    if (type && session?.pc === pc) session.localTypes.add(type);
    emitCallSignal(callId, "ice", candidate.toJSON());
  };

  pc.onconnectionstatechange = () => {
    emitCallDiag(callId, `connection state: ${pc.connectionState}`);
    if (pc.connectionState === "connected") session?.onConnected?.();
    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      session?.onFailed?.();
    }
  };

  // A second opinion on "connected". Some Android builds report the ICE state
  // reliably but are late or silent on `connectionState` — and a call whose
  // audio is flowing must not sit on "Connecting…" because one event was.
  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    if (session?.pc === pc) session.lastIceState = state;
    emitCallDiag(callId, `ice state: ${state}`, {
      localTypes: session?.pc === pc ? [...session.localTypes] : [],
      remoteTypes: session?.pc === pc ? [...session.remoteTypes] : [],
    });
    if (state === "connected" || state === "completed") session?.onConnected?.();
    if (state === "failed") session?.onFailed?.();
  };
}

/**
 * Make sure we may open the microphone, asking if we have not yet.
 *
 * Android only. iOS prompts from inside `getUserMedia` itself, so asking first
 * there would be a second dialog for the same thing.
 *
 * Returns false for a refusal INCLUDING "never ask again", where `request`
 * resolves immediately without showing anything. That case cannot be fixed
 * in-app — it needs the system settings screen — so the honest outcome is a
 * call that fails to start rather than one that connects in silence.
 */
async function ensureMicrophone(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;

  try {
    if (await PermissionsAndroid.check(permission)) return true;

    const result = await PermissionsAndroid.request(permission, {
      title: "Microphone",
      message: "Hello needs your microphone so the other person can hear you.",
      buttonPositive: "Allow",
      buttonNegative: "Not now",
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    // Treated as a refusal. Letting the call proceed would reach
    // `getUserMedia`, throw there, and end the call anyway — with a less
    // obvious reason in the log.
    return false;
  }
}

export type StartOptions = {
  callId: string;
  /** The caller makes the offer; the callee waits for one. */
  role: "caller" | "callee";
  onConnected?: () => void;
  onFailed?: () => void;
};

/**
 * Open the microphone and prepare the connection.
 *
 * Returns false when there is no media to open — mock mode, or a denied
 * microphone permission. The caller shows the call as failed rather than
 * pretending; a silent call is worse than one that says it could not start.
 */
export async function startCallMedia(options: StartOptions): Promise<boolean> {
  if (unavailable()) return false;
  const { callId, role } = options;
  emitCallDiag(callId, "media starting", { role, platform: Platform.OS });

  // Before `getUserMedia`, not after: it throws on a missing permission, and a
  // throw here is indistinguishable from a device with no microphone.
  if (!(await ensureMicrophone())) {
    emitCallDiag(callId, "media FAILED — microphone permission denied", { role });
    return false;
  }

  await stopCallMedia();

  let localStream: MediaStream;
  try {
    localStream = (await lib().mediaDevices.getUserMedia({ audio: true, video: false })) as MediaStream;
  } catch (e) {
    emitCallDiag(callId, "media FAILED — getUserMedia threw", { role, error: errorText(e) });
    return false;
  }

  const servers = await iceServers(callId);
  const pc = new (lib().RTCPeerConnection)({ iceServers: servers });
  for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

  const current: Session = {
    callId: options.callId,
    pc,
    localStream,
    pendingIce: [],
    onConnected: options.onConnected,
    onFailed: options.onFailed,
    offerRetry: null,
    localTypes: new Set(),
    remoteTypes: new Set(),
    hadTurn: servers.some((server) => server.urls.some((url) => url.startsWith("turn"))),
    lastIceState: "new",
  };
  session = current;
  emitCallDiag(callId, "media ready", {
    role,
    turn: current.hadTurn,
    iceServers: servers.map((server) => server.urls.map((url) => url.split(":")[0]).join("+")),
  });

  attach(pc, options.callId);

  if (options.role === "caller") {
    try {
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      emitCallSignal(options.callId, "offer", offer);
      emitCallDiag(callId, "offer sent");
    } catch (e) {
      emitCallDiag(callId, "offer FAILED to create", errorText(e));
      throw e;
    }

    // Until an answer arrives, say it again. One lost offer — the callee not
    // quite ready, a socket that blinked — must not strand the call. The
    // callee answers a repeat of the same offer idempotently.
    let tries = 0;
    current.offerRetry = setInterval(() => {
      tries += 1;
      if (session !== current || pc.signalingState !== "have-local-offer" || tries > 6) {
        if (current.offerRetry) clearInterval(current.offerRetry);
        current.offerRetry = null;
        return;
      }
      if (pc.localDescription) {
        emitCallSignal(options.callId, "offer", pc.localDescription.toJSON());
        emitCallDiag(callId, `offer re-sent (no answer yet) #${tries}`);
      }
    }, 3000);
  }

  // Anything that arrived for this call before we were ready.
  const waiting = early.get(options.callId)?.items ?? [];
  early.delete(options.callId);
  if (waiting.length) {
    emitCallDiag(callId, "replaying early signals", { kinds: waiting.map((w) => w.kind) });
  }
  for (const payload of waiting) await handleCallSignal(payload).catch(() => {});

  return true;
}

/**
 * Why a call did not connect, in a few words — shown with "Couldn't connect"
 * so a failed call says what the network did rather than just failing.
 *
 * No "relay" on OUR side and `turn no` = the server gave us no relay;
 * no "relay" with `turn yes` = the relay was unreachable from this network;
 * nothing from THEM = their side never got going (older build, no signal).
 */
export function callMediaDiagnostics(): string {
  const current = session;
  if (!current) return "no media";
  const list = (types: Set<string>) => (types.size ? [...types].sort().join("+") : "none");
  return `ice ${current.lastIceState} · you ${list(current.localTypes)} · them ${list(current.remoteTypes)} · turn ${current.hadTurn ? "yes" : "no"}`;
}

/**
 * Handle one signalling message from the other side.
 *
 * Ignores anything for a different call: a stale message from a call that has
 * just ended must not renegotiate the one that replaced it.
 */
export async function handleCallSignal(payload: SignalPayload): Promise<void> {
  const current = session;
  if (!current || current.callId !== payload.callId) {
    // Not ready for this call yet (or a stale one — those age out).
    buffer(payload);
    if (payload.kind !== "ice") {
      emitCallDiag(payload.callId, `${payload.kind} received before media was ready — buffered`);
    }
    return;
  }

  try {
    await applySignal(current, payload);
  } catch (e) {
    // The failure that used to vanish: an offer/answer/candidate the
    // connection refused. Reported, then re-thrown for the caller to swallow.
    emitCallDiag(payload.callId, `${payload.kind} FAILED to apply`, {
      error: errorText(e),
      signalingState: current.pc.signalingState,
    });
    throw e;
  }
}

async function applySignal(current: Session, payload: SignalPayload): Promise<void> {
  const { pc } = current;

  if (payload.kind === "offer") {
    const offer = payload.data as { sdp?: string };

    // The caller repeats its offer until it hears an answer. A repeat of the
    // one we already answered gets the same answer back, not a renegotiation.
    if (pc.remoteDescription && pc.remoteDescription.sdp === offer.sdp) {
      if (pc.localDescription) emitCallSignal(current.callId, "answer", pc.localDescription.toJSON());
      emitCallDiag(current.callId, "duplicate offer — re-sent the same answer");
      return;
    }

    emitCallDiag(current.callId, "offer received");
    await pc.setRemoteDescription(new (lib().RTCSessionDescription)(payload.data as never));
    await drainIce(current);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    emitCallSignal(current.callId, "answer", answer);
    emitCallDiag(current.callId, "answer sent");
    return;
  }

  if (payload.kind === "answer") {
    // A second answer to a repeated offer: we are already past it.
    if (pc.signalingState !== "have-local-offer") {
      emitCallDiag(current.callId, "extra answer ignored", { signalingState: pc.signalingState });
      return;
    }
    if (current.offerRetry) clearInterval(current.offerRetry);
    current.offerRetry = null;

    emitCallDiag(current.callId, "answer received");
    await pc.setRemoteDescription(new (lib().RTCSessionDescription)(payload.data as never));
    await drainIce(current);
    return;
  }

  const type = candidateType(payload.data);
  if (type) current.remoteTypes.add(type);

  const candidate = new (lib().RTCIceCandidate)(payload.data as never);
  // See `pendingIce`: before a remote description exists this throws.
  if (pc.remoteDescription) {
    await pc.addIceCandidate(candidate);
  } else {
    current.pendingIce.push(candidate);
  }
}

async function drainIce(current: Session): Promise<void> {
  const queued = current.pendingIce;
  current.pendingIce = [];
  if (queued.length) emitCallDiag(current.callId, `applying ${queued.length} queued ice candidates`);
  for (const candidate of queued) {
    try {
      await current.pc.addIceCandidate(candidate);
    } catch (e) {
      // One bad candidate is not fatal — ICE tries every other pair it has.
      emitCallDiag(current.callId, "queued ice candidate FAILED to apply", errorText(e));
    }
  }
}

/**
 * Mute or unmute the microphone.
 *
 * `enabled = false` keeps the track in the connection and sends silence, which
 * is what the other side expects: removing the track would renegotiate the
 * call mid-sentence.
 */
export function setMuted(muted: boolean): void {
  for (const track of session?.localStream.getAudioTracks() ?? []) {
    track.enabled = !muted;
  }
}

/** Tear everything down. Safe to call twice, and on a call that never started. */
export async function stopCallMedia(): Promise<void> {
  const current = session;
  session = null;
  if (!current) return;
  if (current.offerRetry) clearInterval(current.offerRetry);
  emitCallDiag(current.callId, "media stopped", {
    ice: current.lastIceState,
    localTypes: [...current.localTypes],
    remoteTypes: [...current.remoteTypes],
  });

  for (const track of current.localStream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Already stopped; the release below is what actually matters.
    }
  }

  try {
    current.localStream.release();
  } catch {
    // Not present on every platform build.
  }

  try {
    current.pc.close();
  } catch {
    // Already closed.
  }
}

/** Test seam, and a guard for screens that need to know whether audio is live. */
export function callMediaActive(): boolean {
  return session !== null;
}
