/**
 * The base screen: safe area, a header, and a slot.
 *
 * SafeArea lives here and only here. Scattering it through screens is what
 * produces doubled top padding, and it is structural rather than decorative,
 * so it belongs in the template layer.
 */

import type { ReactNode } from "react";

import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Icon } from "@/components/common/atoms/Icon";
import { SafeArea } from "@/components/common/atoms/SafeArea";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type ScreenShellProps = {
  children: ReactNode;
  title?: string;
  onBack?: () => void;
  /** Header controls, right-aligned. */
  actions?: ReactNode;
  /** Replaces the title on the left — Home puts its location chip here. */
  leading?: ReactNode;
  /** Which edges the safe area pads. Tab screens drop "bottom". */
  edges?: ("top" | "bottom" | "left" | "right")[];
};

export function ScreenShell({
  children,
  title,
  onBack,
  actions,
  leading,
  edges = ["top", "left", "right"],
}: ScreenShellProps) {
  const theme = useTheme();
  const hasHeader = Boolean(title || onBack || actions || leading);

  return (
    <SafeArea edges={edges} style={{ flex: 1, backgroundColor: theme.color.background }}>
      {hasHeader ? (
        <Box
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
            minHeight: 56,
            zIndex: theme.zIndex.header,
          }}
        >
          {onBack ? (
            <Tappable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
            >
              <Icon name={{ ios: "chevron.left", android: "arrow_back" }} size={22} />
            </Tappable>
          ) : null}

          {leading ? (
            <Box style={{ flex: 1 }}>{leading}</Box>
          ) : title ? (
            <Heading level="heading" numberOfLines={1} style={{ flex: 1 }}>
              {title}
            </Heading>
          ) : (
            <Box style={{ flex: 1 }} />
          )}

          {actions}
        </Box>
      ) : null}

      <Box style={{ flex: 1 }}>{children}</Box>
    </SafeArea>
  );
}
