import { router } from "expo-router";

import { Body, Box, Button, SafeArea, TextLink, useTheme } from "@/components/common";
import { Logo } from "@/components/welcome/molecules/Logo";
import { ValueCarousel, type CarouselSlide } from "@/components/welcome/organisms/ValueCarousel";
import { copy } from "@/copy";

const FRIENDS = require("@/assets/images/illustrations/friends.png");

/**
 * Welcome.
 *
 * One primary action: log in. Below it, the way to create an account.
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
          onPress={() => router.push("/login")}
        />

        <TextLink
          prompt={copy.auth.noAccount}
          link={copy.auth.welcomeSignup}
          onPress={() => router.push("/signup")}
        />

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
