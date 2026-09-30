import { router } from "expo-router";
import { useCallback } from "react";

import {
  Divider,
  Caption,
  Card,
  ScreenShell,
  Scroller,
  SettingsRow,
  useTheme,
} from "@/components/common";
import { useFocusLoad } from "@/components/common/hooks/useFocusLoad";
import { copy } from "@/copy";
import { unreadTicketCount, useSupportStore } from "@/stores/support.store";

/**
 * Help — topics and a way to reach someone.
 *
 * "Contact support" opens the support tickets, and carries a count of tickets
 * with a reply you have not read, so an answer from support is visible from
 * here without opening anything.
 *
 * "Browse help topics" stays inert: a help centre is content, and there is
 * none yet. Pointing it at a dead route would be worse than leaving it plainly
 * unwired.
 */
export default function HelpSettingsScreen() {
  const theme = useTheme();
  const tickets = useSupportStore((state) => state.tickets);
  const loadTickets = useSupportStore((state) => state.loadTickets);

  // Best effort — the badge is a courtesy, and the list screen shows errors.
  const refresh = useCallback(() => loadTickets().catch(() => {}), [loadTickets]);
  useFocusLoad(refresh);

  const unread = unreadTicketCount(tickets);

  return (
    <ScreenShell title={copy.settings.help} onBack={() => router.back()}>
      <Scroller contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <Card>
          <SettingsRow
            label={copy.settings.helpBrowse}
            icon={{ ios: "book", android: "menu_book" }}
            showChevron={false}
          />
          <Divider inset={theme.spacing.xxxl} />
          <SettingsRow
            label={copy.settings.helpContact}
            icon={{ ios: "bubble.left.and.bubble.right", android: "support_agent" }}
            value={unread > 0 ? copy.support.unreadValue(unread) : undefined}
            onPress={() => router.push("/support")}
          />
        </Card>

        <Caption>{copy.settings.helpContactHint}</Caption>

        <Card>
          <SettingsRow
            label={copy.settings.safety}
            icon={{ ios: "checkmark.shield", android: "verified_user" }}
            onPress={() => router.push("/settings/safety")}
          />
        </Card>
      </Scroller>
    </ScreenShell>
  );
}
