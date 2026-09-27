import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Card,
  Caption,
  ScreenShell,
  Scroller,
  SettingsRow,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { authService } from "@/services/auth.service";
import type { Session } from "@/services/types";

/**
 * Account — the phone number and how you sign in.
 *
 * Read-only, and short on purpose. There is no email, no password and no social
 * login in this product (PLAN §1), so "sign-in method" has exactly one value
 * and saying so is more honest than hiding the row.
 */
export default function AccountSettingsScreen() {
  const theme = useTheme();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setSession(await authService.getSession());
      } catch {
        // Rows render empty rather than throwing out of an effect.
      }
    })();
  }, []);

  const memberSince = session
    ? new Date(session.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : undefined;

  return (
    <ScreenShell title={copy.settings.account} onBack={() => router.back()}>
      <Scroller contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <Card>
          <SettingsRow
            label={copy.settings.phone}
            value={session?.phone || undefined}
            showChevron={false}
          />
          <SettingsRow
            label={copy.settings.signInMethod}
            value={copy.settings.signInMethodValue}
            showChevron={false}
          />
          <SettingsRow
            label={copy.settings.memberSince}
            value={memberSince}
            showChevron={false}
          />
        </Card>

        <Caption>{copy.settings.accountHint}</Caption>
      </Scroller>
    </ScreenShell>
  );
}
