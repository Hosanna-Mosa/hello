/**
 * Make the phone ring: a looping ringtone.
 *
 * The ring UI existed but was silent — nothing ever played a sound, so a call
 * arriving while the phone was in a pocket went unnoticed.
 *
 * No vibration, deliberately: it needs `android.permission.VIBRATE`, and the
 * operator declined adding a permission for it (2026-09-30).
 *
 * Driven by a boolean rather than mounted/unmounted with the ring screen: the
 * overlay minimises to `IncomingCallBar` and the call must keep ringing there,
 * so the caller of this hook is whatever outlives the minimise.
 *
 * Android: the tone plays on the MEDIA stream (expo-audio has no ringer-stream
 * option), so it follows media volume. iOS: silent mode is respected — the
 * default audio mode does not play in silent, which is what a ringer should do.
 */

import { createAudioPlayer } from "expo-audio";
import { useEffect } from "react";

const RINGTONE = require("@/assets/sounds/ringtone.wav") as number;

export function useRinger(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;

    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      player = createAudioPlayer(RINGTONE);
      player.loop = true;
      player.play();
    } catch {
      // No sound is better than a crash: the ring screen still shows.
      player = null;
    }

    return () => {
      if (player) {
        player.pause();
        player.remove();
      }
    };
  }, [active]);
}
