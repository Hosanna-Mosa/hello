import { router } from "expo-router";

import {
  Box,
  Divider,
  Caption,
  Card,
  ScreenShell,
  Scroller,
  SettingsRow,
  useTheme,
} from "@/components/common";
import { APP_VERSION, copy } from "@/copy";

/**
 * Legal — terms, privacy, licences and the version you are running.
 *
 * The three documents are inert: they are content a client supplies, not
 * something to invent.
 *
 * The version comes from `APP_VERSION`, which reads `app.json` — the same value
 * the build is stamped with. `expo-application` would read it back off the
 * installed binary, which is strictly better, but it is not on the approved
 * dependency list and adding a native module for one line of text on a support
 * screen is not a trade worth making.
 */
export default function LegalSettingsScreen() {
  const theme = useTheme();


  return (
    <ScreenShell title={copy.settings.legal} onBack={() => router.back()}>
      <Scroller contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <Card>
          <SettingsRow label={copy.settings.terms} showChevron={false} />
          <Divider />
          <SettingsRow label={copy.settings.privacy} showChevron={false} />
          <Divider />
          <SettingsRow label={copy.settings.licences} showChevron={false} />
        </Card>

        <Box style={{ alignItems: "center", paddingTop: theme.spacing.lg }}>
          <Caption>{copy.settings.version(APP_VERSION)}</Caption>
        </Box>
      </Scroller>
    </ScreenShell>
  );
}
