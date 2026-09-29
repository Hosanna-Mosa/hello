/**
 * Play one voice message.
 *
 * The player is created EMPTY and loaded on the first tap: loading a source
 * per bubble would download every clip in the conversation just to open it.
 *
 * One clip at a time, across the whole thread — starting one pauses whichever
 * was playing, as in every messaging app.
 *
 * Against the real API the clip is behind the bearer token, so the source
 * carries an `Authorization` header, taken fresh at the moment of loading
 * (`validAccessToken`). The player fetches the file itself and cannot take part
 * in the client's refresh-on-401, so a stale token would simply fail to play.
 */

import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioSource,
} from "expo-audio";
import { useEffect, useRef } from "react";
import { create } from "zustand";

import { apiBaseUrl, isMockMode, validAccessToken } from "@/services/client";
import type { VoiceClip } from "@/services/types";

/** Which message is playing. A tiny store so every bubble can react to it. */
const useNowPlaying = create<{ id: string | null }>(() => ({ id: null }));

async function sourceFor(clip: VoiceClip): Promise<AudioSource> {
  // Mock mode keeps the local recording; a real clip is a path on the API.
  if (isMockMode() || !clip.url.startsWith("/")) return { uri: clip.url };

  const token = await validAccessToken();
  return {
    uri: `${apiBaseUrl()}${clip.url}`,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  };
}

export type VoicePlayback = {
  playing: boolean;
  /** 0..1 through the clip. */
  progress: number;
  /** Seconds to show: elapsed while playing or paused mid-way, else the length. */
  displaySeconds: number;
  toggle: () => void;
};

export function useVoicePlayback(messageId: string, clip: VoiceClip): VoicePlayback {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const loaded = useRef(false);
  const nowPlaying = useNowPlaying((state) => state.id);

  // Someone else started playing: stop this one.
  useEffect(() => {
    if (nowPlaying !== messageId && status.playing) player.pause();
  }, [nowPlaying, messageId, status.playing, player]);

  // Finished: rewind so the next tap plays from the start, and let go.
  useEffect(() => {
    if (!status.didJustFinish) return;
    void player.seekTo(0).catch(() => {});
    player.pause();
    if (useNowPlaying.getState().id === messageId) useNowPlaying.setState({ id: null });
  }, [status.didJustFinish, player, messageId]);

  async function play() {
    useNowPlaying.setState({ id: messageId });
    // Loud and clear, even with the ringer on silent — the user asked to hear it.
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    if (!loaded.current) {
      player.replace(await sourceFor(clip));
      loaded.current = true;
    }
    player.play();
  }

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    void play();
  }

  const duration = status.duration > 0 ? status.duration : clip.durationSec;
  const started = status.playing || status.currentTime > 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  return {
    playing: status.playing,
    progress: started ? progress : 0,
    displaySeconds: Math.round(started ? status.currentTime : clip.durationSec),
    toggle,
  };
}
