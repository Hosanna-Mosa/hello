/**
 * What every ad placeholder is made of.
 *
 * Inert. There is no ad SDK and no network call anywhere in here (A14) — an ad
 * network is a native module, a privacy review and a rebuild, and this phase is
 * the UI those things would eventually fill.
 *
 * The gate lives here and only here: `showAds` is false on premium and also
 * false before the tier is known, so no slot can flash and then vanish. A slot
 * that returned its own `isPremium` check would be twenty chances to get it
 * wrong; this is one.
 *
 * Every slot carries the "Remove ads" CTA into the paywall, because an ad you
 * cannot buy your way out of is just clutter.
 */

import { router } from "expo-router";
import type { ReactNode } from "react";

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useEntitlements } from "@/components/common/hooks/useEntitlements";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

export type AdSlotProps = {
  children: ReactNode;
  /** Announced to screen readers, e.g. "Advertisement". */
  label?: string;
};

export function AdSlot({ children, label = copy.ads.label }: AdSlotProps) {
  const theme = useTheme();
  const { showAds } = useEntitlements();

  if (!showAds) return null;

  return (
    <Box
      accessible
      accessibilityLabel={label}
      style={{
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.adPlaceholder,
        borderWidth: 1,
        borderColor: theme.color.border,
        overflow: "hidden",
      }}
    >
      {children}

      <Box
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
        }}
      >
        <Caption color="textTertiary">{copy.ads.label}</Caption>

        <Tappable
          onPress={() => router.push("/paywall")}
          accessibilityRole="button"
          accessibilityLabel={copy.ads.removeAds}
          hitSlop={8}
        >
          <Caption color="accent">{copy.ads.removeAds}</Caption>
        </Tappable>
      </Box>
    </Box>
  );
}
