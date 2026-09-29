/**
 * Recording a voice message, for the thread composer.
 *
 * `start` on the first tap, `finish` on the second (returns the clip, or null
 * if it was too short to be deliberate), `cancel` from the bin. The first
 * `start` shows the microphone prompt; a `finish`/`cancel` that lands while
 * recording is still starting still stops it.
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

/** Why a start did or did not begin recording. */
export type StartResult = "started" | "denied" | "failed";

export type VoiceRecorder = {
  recording: boolean;
  /** Whole seconds so far, for the on-screen timer. */
  seconds: number;
  start: () => Promise<StartResult>;
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
  const starting = useRef<Promise<StartResult> | null>(null);

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
    // `uri`, with the status's `url` as a fallback — the two are set by
    // different paths in the native module, and a clip is lost if both are
    // not consulted.
    let uri = recorder.uri;
    if (!uri) {
      try {
        uri = recorder.getStatus().url;
      } catch {
        uri = null;
      }
    }
    if (!uri || durationSec < MIN_VOICE_SEC) return null;
    return { uri, durationSec: Math.min(durationSec, MAX_VOICE_SEC) };
  }, [recorder]);

  const start = useCallback(async (): Promise<StartResult> => {
    if (starting.current) return starting.current;
    if (startedAt.current !== null) return "started";
    released.current = false;

    starting.current = (async (): Promise<StartResult> => {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return "denied";

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return "started";
    })().catch((): StartResult => "failed");

    const result = await starting.current;
    starting.current = null;
    if (result !== "started") return result;

    startedAt.current = Date.now();
    setRecording(true);

    // Stopped while we were still starting: nothing deliberate was recorded.
    if (released.current) await stopAndRead();
    return "started";
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
