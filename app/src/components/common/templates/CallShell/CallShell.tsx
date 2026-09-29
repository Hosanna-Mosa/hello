/**
 * The frame for a voice call.
 *
 * Always dark regardless of theme: a call takeover that follows the light theme
 * looks like a screen rather than a call, on every platform people already know.
 *
 * Voice only — there is no video anywhere in this product and no mic permission
 * is requested (A17). This is a full-screen presentational frame; Phase 7 drives
 * the state machine through it.
 */

import type { ReactNode } from "react";

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Icon } from "@/components/common/atoms/Icon";
import { SafeArea } from "@/components/common/atoms/SafeArea";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { dark } from "@/theme";
import { ThemeProvider } from "@/theme/ThemeProvider";

export type CallShellProps = {
  /** The avatar, centred. */
  children: ReactNode;
  name: string;
  /** "Ringing…", "02:14", "Call ended". */
  status: string;
  /** Mute / speaker / end. */
  controls: ReactNode;
  /**
   * Show a back chevron top-left. The incoming ring uses it to step away
   * without answering — the call keeps ringing in a strip at the top.
   */
  onBack?: (() => void) | undefined;
  backLabel?: string | undefined;
};

export function CallShell({ children, name, status, controls, onBack, backLabel }: CallShellProps) {
  const theme = useTheme();

  return (
    <Box style={{ flex: 1, backgroundColor: dark.color.background }}>
      <SafeArea style={{ flex: 1 }}>
        {onBack ? (
          <Box style={{ paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md }}>
            <Tappable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={backLabel ?? "Go back"}
              hitSlop={12}
              style={{ alignSelf: "flex-start" }}
            >
              {/* The shell is always dark, so the glyph must be too. */}
              <ThemeProvider override="dark">
                <Icon name={{ ios: "chevron.left", android: "arrow_back" }} size={22} />
              </ThemeProvider>
            </Tappable>
          </Box>
        ) : null}

        <Box
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.lg,
          }}
        >
          {children}

          <Heading level="heading" style={{ color: dark.color.textPrimary }}>
            {name}
          </Heading>

          <Body
            accessibilityLiveRegion="polite"
            style={{ color: dark.color.textSecondary }}
          >
            {status}
          </Body>
        </Box>

        <Box
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: theme.spacing.xl,
            paddingBottom: theme.spacing.xxxl,
          }}
        >
          {controls}
        </Box>
      </SafeArea>
    </Box>
  );
}
