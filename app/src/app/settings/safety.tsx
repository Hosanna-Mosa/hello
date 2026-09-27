import { router } from "expo-router";

import {
  Body,
  Box,
  Button,
  Icon,
  ScreenShell,
  Scroller,
  SectionHeader,
  useTheme,
} from "@/components/common";
import { SafetyCard } from "@/components/settings/safety/molecules/SafetyCard";
import { copy } from "@/copy";

/**
 * Safety — the community standards, then the practical advice.
 *
 * Card layout from the design, with two changes.
 *
 * The design's first card uses a red heart for "Be respectful". A heart is the
 * single most romance-coded glyph there is, and this product is platonic only
 * (PLAN §1) — the same reason there is no heart in the chat reaction picker.
 * It is a waving hand here.
 *
 * The design's four cards are community standards; PLAN also requires
 * meeting-in-person guidance, which is different advice for a different moment.
 * Both are here, standards first.
 */
export default function SafetySettingsScreen() {
  const theme = useTheme();

  const icons = [
    { ios: "hand.wave", android: "waving_hand" },
    { ios: "person.2", android: "group" },
    { ios: "flag", android: "flag" },
    { ios: "doc.text", android: "description" },
  ] as const;

  return (
    <ScreenShell title={copy.safety.title} onBack={() => router.back()}>
      <Scroller
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.xl,
          gap: theme.spacing.md,
        }}
      >
        {/*
          Stands in for the design's shield illustration. The artwork does not
          exist yet (R2), and a missing image reads as a broken one.
        */}
        <Box style={{ alignItems: "center", paddingVertical: theme.spacing.lg }}>
          <Box
            style={{
              width: 88,
              height: 88,
              borderRadius: theme.radius.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.color.secondaryMuted,
            }}
          >
            <Icon
              name={{ ios: "checkmark.shield.fill", android: "verified_user" }}
              size={44}
              color="secondary"
            />
          </Box>
        </Box>

        {copy.safety.standards.map((standard, index) => (
          <SafetyCard
            key={standard.title}
            title={standard.title}
            body={standard.body}
            icon={icons[index]}
            tone={index}
          />
        ))}

        <Box style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.sm }}>
          <SectionHeader title={copy.safety.tipsTitle} />

          {copy.safety.tips.map((tip) => (
            <Box
              key={tip}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
              }}
            >
              <Box style={{ paddingTop: 2 }}>
                <Icon
                  name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
                  size={18}
                  color="secondary"
                />
              </Box>
              <Body color="textSecondary" style={{ flex: 1 }}>
                {tip}
              </Body>
            </Box>
          ))}
        </Box>

        <Box style={{ paddingTop: theme.spacing.lg }}>
          <Button label={copy.safety.acknowledge} onPress={() => router.back()} />
        </Box>
      </Scroller>
    </ScreenShell>
  );
}
