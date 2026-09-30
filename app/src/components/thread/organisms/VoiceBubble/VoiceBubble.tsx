/**
 * A voice message in the thread: the ordinary chat bubble — same sides, same
 * colours, same long-press to react — holding a player instead of text.
 *
 * Its own component because playback is per-message state, and a hook cannot
 * live inside the list's `renderItem`.
 */

import { formatCallDuration } from "@/components/common/hooks/useCallTimer";
import { useVoicePlayback } from "@/components/thread/hooks/useVoicePlayback";
import { ChatBubble } from "@/components/common/molecules/ChatBubble";
import { VoicePlayer } from "@/components/thread/molecules/VoicePlayer";
import { copy } from "@/copy";
import type { Reaction, VoiceClip } from "@/services/types";

export type VoiceBubbleProps = {
  messageId: string;
  voice: VoiceClip;
  mine: boolean;
  timestamp: string;
  reactions?: Reaction[];
  onLongPress?: () => void;
};

export function VoiceBubble({
  messageId,
  voice,
  mine,
  timestamp,
  reactions,
  onLongPress,
}: VoiceBubbleProps) {
  const playback = useVoicePlayback(messageId, voice);

  return (
    <ChatBubble
      body={copy.chat.voiceLabel(mine, formatCallDuration(Math.round(voice.durationSec)))}
      mine={mine}
      timestamp={timestamp}
      reactions={reactions}
      onLongPress={onLongPress}
    >
      <VoicePlayer
        mine={mine}
        playing={playback.playing}
        progress={playback.progress}
        seconds={playback.displaySeconds}
        onToggle={playback.toggle}
      />
    </ChatBubble>
  );
}
