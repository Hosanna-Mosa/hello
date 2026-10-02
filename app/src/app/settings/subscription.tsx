import { Linking, Platform } from "react-native";
import { router } from "expo-router";
import { useState } from "react";

import {
  Body,
  Card,
  Box,
  Button,
  Caption,
  Divider,
  ScreenShell,
  Scroller,
  SectionHeader,
  SettingsRow,
  ToggleRow,
  useEntitlements,
  useTheme,
} from "@/components/common";
import { BenefitList } from "@/components/common/molecules/BenefitList";
import { copy } from "@/copy";
import { isMockMode } from "@/services/client";
import { useEntitlementsStore } from "@/stores/entitlements.store";

/**
 * Subscription — what you are on, and the two things a store requires.
 *
 * **Restore Purchases is mandatory on the App Store** (R13) and is here from
 * day one even though it restores nothing yet, because it is the kind of thing
 * that gets discovered in review rather than in development.
 *
 * "Manage subscription" deep-links to the platform's own subscription screen.
 * Both URLs are the real ones; there is simply no subscription behind them.
 */
const MANAGE_URL = Platform.select({
  ios: "https://apps.apple.com/account/subscriptions",
  android: "https://play.google.com/store/account/subscriptions",
  default: "https://play.google.com/store/account/subscriptions",
});

export default function SubscriptionSettingsScreen() {
  const theme = useTheme();
  const { isPremium, entitlements } = useEntitlements();

  const setPremium = useEntitlementsStore((state) => state.setPremium);
  const restore = useEntitlementsStore((state) => state.restore);

  const [restoring, setRestoring] = useState(false);

  async function onRestore() {
    setRestoring(true);
    try {
      await restore();
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScreenShell title={copy.settings.subscription} onBack={() => router.back()}>
      <Scroller
        contentContainerStyle={{
          padding: theme.spacing.xl,
          gap: theme.spacing.xl,
        }}
      >
        <Box style={{ gap: theme.spacing.sm }}>
          <SectionHeader title={copy.settings.subscription} />
          <Body strong>
            {isPremium ? copy.premium.premiumPlan : copy.premium.freePlan}
          </Body>
          {isPremium && entitlements?.expiresAt ? (
            <Caption>{copy.premium.activeUntil(new Date(entitlements.expiresAt))}</Caption>
          ) : null}
          <Caption>{isMockMode() ? copy.premium.terms : copy.premium.termsLive}</Caption>
        </Box>

        {isPremium ? (
          <BenefitList />
        ) : (
          <Button label={copy.premium.title} onPress={() => router.push("/paywall")} />
        )}

        <Card>
          <SettingsRow
            label={copy.premium.restore}
            icon={{ ios: "arrow.clockwise", android: "refresh" }}
            value={restoring ? copy.premium.restoring : undefined}
            onPress={() => void onRestore()}
            showChevron={false}
          />
          {/* A Razorpay pass is not a store subscription, so there is nothing
              to manage in the Play/App Store account — mock-only row. */}
          {isMockMode() ? (
            <>
              <Divider inset={theme.spacing.xxxl} />
              <SettingsRow
                label={copy.premium.manage}
                icon={{ ios: "arrow.up.right.square", android: "open_in_new" }}
                onPress={() => void Linking.openURL(MANAGE_URL)}
              />
            </>
          ) : null}
        </Card>

        {/*
          The demo switch (A15). Premium is a session toggle because there is no
          billing provider, and a client walkthrough has to be able to show both
          tiers without one. Absent from a release build.
        */}
        {__DEV__ && isMockMode() ? (
          <Box style={{ gap: theme.spacing.sm }}>
            <SectionHeader title="Demo" />
            <ToggleRow
              label={copy.premium.devToggle}
              description={copy.premium.devToggleHint}
              value={isPremium}
              onValueChange={(next) => void setPremium(next)}
            />
          </Box>
        ) : null}
      </Scroller>
    </ScreenShell>
  );
}
