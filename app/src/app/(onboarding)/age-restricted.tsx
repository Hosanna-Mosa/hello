import { useEffect } from "react";
import { BackHandler } from "react-native";

import { Body, Box, Heading, Label, Picture, SafeArea, Tappable, useTheme } from "@/components/common";
import { copy } from "@/copy";

const AGE_GATE = require("@/assets/images/illustrations/age-gate.png");

/**
 * The 18+ dead end.
 *
 * Terminal by design: no back chevron, no Continue, no progress bar, nothing to
 * tap forward. The only control is Contact support.
 *
 * Deliberately gentle rather than punitive. A rejected 17-year-old is a future
 * user, not an adversary, and the illustration and copy are both chosen to say
 * "not yet" rather than "you are not welcome".
 */
export default function AgeRestrictedScreen() {
  const theme = useTheme();

  /**
   * Swallow the Android hardware back button.
   *
   * `gestureEnabled: false` stops the swipe but NOT hardware back — verified on
   * a device: back walked straight out of the dead end and back to the birthday
   * wheel, where the date can simply be changed. That defeats the whole gate.
   *
   * Android only by nature; iOS has no hardware back and its swipe is already
   * disabled in the layout.
   */
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);

  return (
    <SafeArea style={{ flex: 1, backgroundColor: theme.color.background }}>
      <Box
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        <Picture
          source={AGE_GATE}
          contentFit="contain"
          style={{ width: "100%", height: 280 }}
          accessibilityLabel="A closed door with an 18 plus sign"
        />

        <Heading level="heading" style={{ textAlign: "center" }}>
          {copy.onboarding.restrictedTitle}
        </Heading>

        <Body color="textSecondary" style={{ textAlign: "center", fontSize: 16, lineHeight: 24 }}>
          {copy.onboarding.restrictedBody}
        </Body>
      </Box>

      <Box style={{ alignItems: "center", paddingBottom: theme.spacing.xxl }}>
        <Tappable
          onPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel={copy.onboarding.restrictedSupport}
          hitSlop={12}
        >
          <Label color="textSecondary" style={{ textDecorationLine: "underline" }}>
            {copy.onboarding.restrictedSupport}
          </Label>
        </Tappable>
      </Box>
    </SafeArea>
  );
}
