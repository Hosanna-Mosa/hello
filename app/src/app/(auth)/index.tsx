import { router } from "expo-router";

import { Body, Box, Button, Label, SafeArea, Tappable, useTheme } from "@/components/common";
import { Logo } from "@/components/welcome/molecules/Logo";
import { ValueCarousel, type CarouselSlide } from "@/components/welcome/organisms/ValueCarousel";
import { copy } from "@/copy";

const FRIENDS = require("@/assets/images/illustrations/friends.png");

/**
 * Welcome.
 *
 * One primary action: phone. Below it, a quiet "Log in with email" link for
 * store reviewers, whose credentials the server maps to one existing account.
 */
export default function WelcomeScreen() {
  const theme = useTheme();

  const slides: CarouselSlide[] = [
    {
      title: copy.auth.welcomeTitle,
      subtitle: copy.auth.welcomeSubtitle,
      illustration: FRIENDS,
    },
    {
      title: copy.auth.welcomeSlide2Title,
      subtitle: copy.auth.welcomeSlide2Subtitle,
      illustration: FRIENDS,
    },
    {
      title: copy.auth.welcomeSlide3Title,
      subtitle: copy.auth.welcomeSlide3Subtitle,
      illustration: FRIENDS,
    },
  ];

  return (
    <SafeArea style={{ flex: 1, backgroundColor: theme.color.background }}>
      <Box style={{ alignItems: "center", paddingTop: theme.spacing.sm }}>
        <Logo />
      </Box>

      <ValueCarousel slides={slides} />

      <Box style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
        <Button
          label={copy.auth.welcomeCta}
          onPress={() => router.push("/phone")}
        />

        <Tappable
          onPress={() => router.push("/email")}
          accessibilityRole="link"
          accessibilityLabel={copy.auth.emailLink}
          hitSlop={12}
          style={{ alignSelf: "center" }}
        >
          <Label color="accent" style={{ textDecorationLine: "underline" }}>
            {copy.auth.emailLink}
          </Label>
        </Tappable>

        <Body
          color="textSecondary"
          style={{
            textAlign: "center",
            fontSize: 12,
            lineHeight: 16,
            paddingBottom: theme.spacing.md,
          }}
        >
          {copy.auth.legal}
        </Body>
      </Box>
    </SafeArea>
  );
}
