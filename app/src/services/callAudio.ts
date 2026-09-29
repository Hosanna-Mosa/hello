/**
 * Call audio routing — the JS face of `modules/call-audio` (Android only).
 *
 * Without it a call played on the voice-call stream while the volume keys moved
 * MEDIA volume, so a call sounded quiet at "full volume", and the Speaker button
 * switched nothing (PLAN #166). The native module sets call mode, points the
 * volume keys at the call, and switches loudspeaker ↔ earpiece.
 *
 * Every function is a no-op where the module is absent — iOS, Jest, and any
 * build made before the module was added. A missing route must never break a
 * call, only leave it on the platform's default.
 */

import { requireOptionalNativeModule } from "expo";

type CallAudioModule = {
  start(speaker: boolean): Promise<void>;
  setSpeaker(speaker: boolean): Promise<void>;
  stop(): Promise<void>;
};

const native = requireOptionalNativeModule<CallAudioModule>("CallAudio");

async function safely(run: (module: CallAudioModule) => Promise<void>): Promise<void> {
  if (!native) return;
  try {
    await run(native);
  } catch {
    // Routing is a nicety on top of a working call; never let it end one.
  }
}

export const callAudio = {
  /** Enter call mode. Earpiece unless `speaker`. */
  start: (speaker = false) => safely((m) => m.start(speaker)),
  setSpeaker: (speaker: boolean) => safely((m) => m.setSpeaker(speaker)),
  /** Restore the phone's audio exactly as it was before the call. */
  stop: () => safely((m) => m.stop()),
};
