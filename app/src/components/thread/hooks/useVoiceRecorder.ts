/**
 * Hold-to-record, for the thread composer.
 *
 * `start` on finger-down, `finish` on release (returns the clip, or null if it
 * was too short to be deliberate), `cancel` on slide-away. The three can arrive
 * in any order relative to the async work — the first hold shows the
 * microphone prompt, and the finger is usually lifted while it is up — so
 * a release that lands before recording actually began still stops it.
 */

import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech, not music: mono AAC at 64 kbps in an MP4 container — about 0.5 MB a
 * minute, and exactly the container the server sniffs for.
 */
const VOICE_PRESET: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64_000,
};

/** A tap on the mic is not a message. WhatsApp's threshold, give or take. */
export const MIN_VOICE_SEC = 1;
/** Matches the server's `VOICE_MAX_SEC`; recording stops and sends itself here. */
export const MAX_VOICE_SEC = 120;

export type VoiceClip = { uri: string; durationSec: number };

export type VoiceRecorder = {
  recording: boolean;
  /** Whole seconds so far, for the on-screen timer. */
  seconds: number;
  start: () => Promise<void>;
  finish: () => Promise<VoiceClip | null>;
  cancel: () => Promise<void>;
};

export function useVoiceRecorder(onAutoFinish: (clip: VoiceClip) => void): VoiceRecorder {
  const recorder = useAudioRecorder(VOICE_PRESET);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  /** `Date.now()` when recording actually began, or null. */
  const startedAt = useRef<number | null>(null);
  /** Set by a release that arrived while `start` was still working. */
  const released = useRef(false);
  const starting = useRef<Promise<boolean> | null>(null);

  const stopAndRead = useCallback(async (): Promise<VoiceClip | null> => {
    const began = startedAt.current;
    startedAt.current = null;
    setRecording(false);
    setSeconds(0);
    if (began === null) return null;

    try {
      await recorder.stop();
    } catch {
      return null;
    }
    // Hand the audio session back to playback.
    void setAudioModeAsync({ allowsRecording: false }).catch(() => {});

    const durationSec = (Date.now() - began) / 1000;
    const uri = recorder.uri;
    if (!uri || durationSec < MIN_VOICE_SEC) return null;
    return { uri, durationSec: Math.min(durationSec, MAX_VOICE_SEC) };
  }, [recorder]);

  const start = useCallback(async () => {
    if (starting.current || startedAt.current !== null) return;
    released.current = false;

    starting.current = (async () => {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return false;

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    })().catch(() => false);

    const ok = await starting.current;
    starting.current = null;
    if (!ok) return;

    startedAt.current = Date.now();
    setRecording(true);

    // Released while we were still starting (the permission prompt, usually):
    // there is no deliberate message here, so throw it away.
    if (released.current) await stopAndRead();
  }, [recorder, stopAndRead]);

  const finish = useCallback(async () => {
    released.current = true;
    if (starting.current) await starting.current;
    return stopAndRead();
  }, [stopAndRead]);

  const cancel = useCallback(async () => {
    released.current = true;
    if (starting.current) await starting.current;
    await stopAndRead();
  }, [stopAndRead]);

  // The timer, and the hard stop at the server's limit.
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const began = startedAt.current;
      if (began === null) return;
      const elapsed = Math.floor((Date.now() - began) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_VOICE_SEC) {
        void stopAndRead().then((clip) => {
          if (clip) onAutoFinish(clip);
        });
      }
    }, 250);
    return () => clearInterval(id);
  }, [recording, stopAndRead, onAutoFinish]);

  // Leaving the screen mid-recording discards it and frees the microphone.
  useEffect(() => {
    return () => {
      if (startedAt.current !== null) {
        startedAt.current = null;
        try {
          void recorder.stop().catch(() => {});
        } catch {
          // The recorder may already be released along with the screen.
        }
      }
    };
  }, [recorder]);

  return { recording, seconds, start, finish, cancel };
}
