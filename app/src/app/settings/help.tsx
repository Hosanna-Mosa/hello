import { router } from "expo-router";

import {
  Divider,
  Caption,
  Card,
  ScreenShell,
  Scroller,
  SettingsRow,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";

/**
 * Help — topics and a way to reach someone.
 *
 * Both rows are inert on purpose. A help centre is content, and a contact form
 * needs somewhere to send it; neither exists without a backend. The rows are
 * here because PLAN requires the screen, and pointing them at a dead route
 * would be worse than leaving them plainly unwired.
 */
export default function HelpSettingsScreen() {
  const theme = useTheme();

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
            icon={{ ios: "envelope", android: "mail" }}
            showChevron={false}
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
