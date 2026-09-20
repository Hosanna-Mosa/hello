import { router } from "expo-router";
import { useEffect } from "react";

import { Box, Caption, ScreenShell, Scroller, ToggleRow, useTheme } from "@/components/common";
import { copy } from "@/copy";
import type { NotificationChannel } from "@/services/types";
import { useSettingsStore } from "@/stores/settings.store";

const CHANNELS: { channel: NotificationChannel; label: string }[] = [
  { channel: "newMatches", label: copy.settings.channelNewMatches },
  { channel: "messages", label: copy.settings.channelMessages },
  { channel: "messageRequests", label: copy.settings.channelMessageRequests },
  { channel: "likes", label: copy.settings.channelLikes },
  { channel: "calls", label: copy.settings.channelCalls },
];

/**
 * Notifications — one toggle per channel.
 *
 * Per-channel rather than a master switch, because "tell me about a new match
 * but not about every message" is the setting people actually want, and a
 * single on/off makes them turn the lot off.
 *
 * These are preferences, not the OS permission. That is primed once, after the
 * first match (A4).
 */
export default function NotificationSettingsScreen() {
  const theme = useTheme();

  const preferences = useSettingsStore((state) => state.preferences);
  const load = useSettingsStore((state) => state.load);
  const setChannel = useSettingsStore((state) => state.setNotificationChannel);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenShell title={copy.settings.notifications} onBack={() => router.back()}>
      <Scroller contentContainerStyle={{ paddingVertical: theme.spacing.lg }}>
        <Box style={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md }}>
          <Caption>{copy.settings.notificationsHint}</Caption>
        </Box>

        {CHANNELS.map(({ channel, label }) => (
          <ToggleRow
            key={channel}
            label={label}
            value={preferences?.notifications[channel] ?? true}
            onValueChange={(next) => void setChannel(channel, next)}
            disabled={!preferences}
          />
        ))}
      </Scroller>
    </ScreenShell>
  );
}
