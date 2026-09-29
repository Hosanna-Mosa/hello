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

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  type MediaStream,
} from "react-native-webrtc";

import { http, isMockMode } from "./client";
import { emitCallSignal } from "./socket";

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
};

let session: Session | null = null;

/** Mock mode has no server to fetch from and no media to negotiate. */
function unavailable(): boolean {
  return isMockMode();
}

async function iceServers(): Promise<IceServer[]> {
  try {
    const res = await http<{ iceServers: IceServer[] }>("GET", "/calls/ice");
    return res.iceServers;
  } catch {
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
    if (candidate) emitCallSignal(callId, "ice", candidate.toJSON());
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") session?.onConnected?.();
    if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      session?.onFailed?.();
    }
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

  // Before `getUserMedia`, not after: it throws on a missing permission, and a
  // throw here is indistinguishable from a device with no microphone.
  if (!(await ensureMicrophone())) return false;

  await stopCallMedia();

  let localStream: MediaStream;
  try {
    localStream = (await mediaDevices.getUserMedia({ audio: true, video: false })) as MediaStream;
  } catch {
    return false;
  }

  const pc = new RTCPeerConnection({ iceServers: await iceServers() });
  for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

  session = {
    callId: options.callId,
    pc,
    localStream,
    pendingIce: [],
    onConnected: options.onConnected,
    onFailed: options.onFailed,
  };

  attach(pc, options.callId);

  if (options.role === "caller") {
    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    emitCallSignal(options.callId, "offer", offer);
  }

  return true;
}

/**
 * Handle one signalling message from the other side.
 *
 * Ignores anything for a different call: a stale message from a call that has
 * just ended must not renegotiate the one that replaced it.
 */
export async function handleCallSignal(payload: {
  callId: string;
  kind: "offer" | "answer" | "ice";
  data: unknown;
}): Promise<void> {
  const current = session;
  if (!current || current.callId !== payload.callId) return;

  const { pc } = current;

  if (payload.kind === "offer") {
    await pc.setRemoteDescription(new RTCSessionDescription(payload.data as never));
    await drainIce(current);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    emitCallSignal(current.callId, "answer", answer);
    return;
  }

  if (payload.kind === "answer") {
    await pc.setRemoteDescription(new RTCSessionDescription(payload.data as never));
    await drainIce(current);
    return;
  }

  const candidate = new RTCIceCandidate(payload.data as never);
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
  for (const candidate of queued) {
    try {
      await current.pc.addIceCandidate(candidate);
    } catch {
      // One bad candidate is not fatal — ICE tries every other pair it has.
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
