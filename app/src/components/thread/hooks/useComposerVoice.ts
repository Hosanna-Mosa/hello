/**
 * Everything the thread composer needs for voice messages, so the screen only
 * passes one object through.
 *
 * Tap the mic → record ("Recording… please speak"); tap it again → stop and
 * send; tap the bin → discard. The microphone is off-limits during a voice
 * call: the call already owns it, and recording would silence the person on
 * the other end.
 */

import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

import { useVoiceRecorder, type VoiceClip } from "@/components/thread/hooks/useVoiceRecorder";
import type { ComposerVoice } from "@/components/thread/organisms/ChatComposer";
import { copy } from "@/copy";
import { useActiveCallStore } from "@/stores/activeCall.store";
import { useChatStore } from "@/stores/chat.store";

export type ComposerVoiceState = {
  voice: ComposerVoice;
  /** Shown above the composer after a problem; cleared by the next tap. */
  error: string | null;
};

export function useComposerVoice(threadId: string, onSent: () => void): ComposerVoiceState {
  const sendVoice = useChatStore((state) => state.sendVoice);
  const onCall = useActiveCallStore((state) => state.active !== null);

  const [error, setError] = useState<string | null>(null);

  const deliver = useCallback(
    (clip: VoiceClip) => {
      onSent();
      sendVoice(threadId, clip.uri, clip.durationSec).catch((e: unknown) => {
        // The reason, not just "couldn't send": `network` vs a server refusal
        // vs an unreadable file are three different fixes.
        const err = e as { code?: string; message?: string } | null;
        const reason = err?.message && err.message !== err.code ? err.message : err?.code;
        setError(reason ? copy.chat.voiceFailedBecause(`(${reason})`) : copy.chat.voiceFailed);
      });
    },
    [threadId, sendVoice, onSent],
  );

  const recorder = useVoiceRecorder(deliver);

  const onToggle = useCallback(() => {
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (recorder.recording) {
      void recorder.finish().then((clip) => {
        if (clip) deliver(clip);
        else setError(copy.chat.voiceTooShort);
      });
      return;
    }

    void recorder.start().then((result) => {
      if (result === "denied") setError(copy.chat.voiceMicDenied);
      else if (result === "failed") setError(copy.chat.voiceMicFailed);
    });
  }, [recorder, deliver]);

  const onCancel = useCallback(() => {
    setError(null);
    void recorder.cancel();
  }, [recorder]);

  return {
    voice: {
      recording: recorder.recording,
      seconds: recorder.seconds,
      disabled: onCall,
      onToggle,
      onCancel,
    },
    error,
  };
}
