/**
 * Everything the thread composer needs for voice messages, so the screen only
 * passes one object through.
 *
 * Hold → record, release → send, slide past `CANCEL_SLIDE_PX` → discard. The
 * microphone is off-limits during a voice call: the call already owns it, and
 * recording would silence the person on the other end.
 */

import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import { useVoiceRecorder, type VoiceClip } from "@/components/thread/hooks/useVoiceRecorder";
import { CANCEL_SLIDE_PX } from "@/components/thread/molecules/RecordButton";
import type { ComposerVoice } from "@/components/thread/organisms/ChatComposer";
import { copy } from "@/copy";
import { useActiveCallStore } from "@/stores/activeCall.store";
import { useChatStore } from "@/stores/chat.store";

export type ComposerVoiceState = {
  voice: ComposerVoice;
  /** Shown above the composer after a failed send; cleared by the next press. */
  error: string | null;
};

export function useComposerVoice(threadId: string, onSent: () => void): ComposerVoiceState {
  const sendVoice = useChatStore((state) => state.sendVoice);
  const onCall = useActiveCallStore((state) => state.active !== null);

  const [cancelArmed, setCancelArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliver = useCallback(
    (clip: VoiceClip) => {
      onSent();
      sendVoice(threadId, clip.uri, clip.durationSec).catch(() => setError(copy.chat.voiceFailed));
    },
    [threadId, sendVoice, onSent],
  );

  const recorder = useVoiceRecorder(deliver);

  const onPressIn = useCallback(() => {
    setError(null);
    setCancelArmed(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void recorder.start();
  }, [recorder]);

  const onSlide = useCallback((dx: number) => setCancelArmed(dx <= -CANCEL_SLIDE_PX), []);

  const onRelease = useCallback(
    (cancelled: boolean) => {
      setCancelArmed(false);
      if (cancelled) {
        void recorder.cancel();
        return;
      }
      void recorder.finish().then((clip) => {
        if (clip) deliver(clip);
      });
    },
    [recorder, deliver],
  );

  return {
    voice: {
      recording: recorder.recording,
      seconds: recorder.seconds,
      cancelArmed,
      disabled: onCall,
      onPressIn,
      onRelease,
      onSlide,
    },
    error,
  };
}
