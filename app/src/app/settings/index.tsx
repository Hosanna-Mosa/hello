import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Box,
  Divider,
  ConfirmDialog,
  ScreenShell,
  Scroller,
  SectionHeader,
  Card,
  SettingsRow,
  ToggleRow,
  useEntitlements,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { useSessionStore } from "@/stores/session.store";
import { useUiStore } from "@/stores/ui.store";
import { useSettingsStore } from "@/stores/settings.store";

/**
 * The settings tree.
 *
 * Grouped rows with the design's treatment — icon, label, chevron, hairline —
 * but PLAN's items rather than the design's. The design shows a generic
 * skeleton (Privacy, Data & storage, About); PLAN names the nine screens this
 * product actually needs, and PLAN wins where they disagree.
 *
 * Log out sits alone at the bottom in red, as the design has it, and confirms
 * before doing anything.
 */
export default function SettingsScreen() {
  const theme = useTheme();
  const signOut = useSessionStore((state) => state.signOut);
  const { isPremium } = useEntitlements();

  const themeOverride = useUiStore((state) => state.themeOverride);
  const setThemeOverride = useUiStore((state) => state.setThemeOverride);
  const preferences = useSettingsStore((state) => state.preferences);
  const load = useSettingsStore((state) => state.load);

  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const divider = <Divider inset={theme.spacing.xxxl} />;

  return (
    <ScreenShell title={copy.settings.title} onBack={() => router.back()}>
      <Scroller
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
        }}
      >
        <Card>
          <SettingsRow
            label={copy.settings.account}
            icon={{ ios: "person", android: "person" }}
            onPress={() => router.push("/settings/account")}
          />
          {divider}
          <SettingsRow
            label={copy.settings.discovery}
            // The one setting worth seeing without opening the screen.
            value={
              preferences
                ? preferences.discoverable
                  ? copy.settings.visible
                  : copy.settings.hidden
                : undefined
            }
            icon={{ ios: "slider.horizontal.3", android: "tune" }}
            onPress={() => router.push("/settings/discovery")}
          />
          {divider}
          <SettingsRow
            label={copy.settings.notifications}
            icon={{ ios: "bell", android: "notifications" }}
            onPress={() => router.push("/settings/notifications")}
          />
          {divider}
          <SettingsRow
            label={copy.settings.subscription}
            value={isPremium ? copy.premium.premiumPlan : copy.premium.freePlan}
            icon={{ ios: "star", android: "star" }}
            onPress={() => router.push("/settings/subscription")}
          />
        </Card>

        <Box style={{ gap: theme.spacing.sm }}>
          <SectionHeader title={copy.settings.appearance} />
          <Card>
            {/*
              Two-way, not three-way. The store can still hold `null` to follow
              the system, but nothing here sets it: this product is dark by
              default, and a switch is what was asked for. A "Follow system"
              option is a third row away if it is ever wanted.
            */}
            <ToggleRow
              label={copy.settings.darkMode}
              description={copy.settings.darkModeHint}
              value={themeOverride !== "light"}
              onValueChange={(next) => setThemeOverride(next ? "dark" : "light")}
            />
          </Card>
        </Box>

        <Box style={{ gap: theme.spacing.sm }}>
          <SectionHeader title={copy.settings.safety} />
          <Card>
            <SettingsRow
              label={copy.settings.safety}
              icon={{ ios: "checkmark.shield", android: "verified_user" }}
              onPress={() => router.push("/settings/safety")}
            />
            {divider}
            <SettingsRow
              label={copy.settings.blocked}
              icon={{ ios: "hand.raised", android: "block" }}
              onPress={() => router.push("/settings/blocked")}
            />
          </Card>
        </Box>

        <Card>
          <SettingsRow
            label={copy.settings.help}
            icon={{ ios: "questionmark.circle", android: "help" }}
            onPress={() => router.push("/settings/help")}
          />
          {divider}
          <SettingsRow
            label={copy.settings.legal}
            icon={{ ios: "info.circle", android: "info" }}
            onPress={() => router.push("/settings/legal")}
          />
        </Card>

        {/* Both of these end something. They are last, and they both confirm. */}
        <Card>
          <SettingsRow
            label={copy.settings.logout}
            icon={{ ios: "rectangle.portrait.and.arrow.right", android: "logout" }}
            onPress={() => setConfirmingLogout(true)}
            destructive
            showChevron={false}
          />
          {divider}
          <SettingsRow
            label={copy.settings.deleteAccount}
            icon={{ ios: "trash", android: "delete" }}
            onPress={() => router.push("/settings/delete-account")}
            destructive
          />
        </Card>
      </Scroller>

      <ConfirmDialog
        visible={confirmingLogout}
        title={copy.settings.logoutTitle}
        message={copy.settings.logoutBody}
        confirmLabel={copy.settings.logout}
        destructive
        onConfirm={() => {
          setConfirmingLogout(false);
          void signOut();
        }}
        onCancel={() => setConfirmingLogout(false)}
      />
    </ScreenShell>
  );
}
