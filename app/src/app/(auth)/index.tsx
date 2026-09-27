import { router } from "expo-router";

import { Body, Box, Button, SafeArea, useTheme } from "@/components/common";
import { Logo } from "@/components/welcome/molecules/Logo";
import { ValueCarousel, type CarouselSlide } from "@/components/welcome/organisms/ValueCarousel";
import { copy } from "@/copy";

const FRIENDS = require("@/assets/images/illustrations/friends.png");

/**
 * Welcome.
 *
 * One action, and only one: phone. There is no Google, Apple, Facebook or email
 * sign-in anywhere in this product (PLAN §1), so a social button row here would
 * be fiction.
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
