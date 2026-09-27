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
import { SafeArea } from "@/components/common/atoms/SafeArea";
import { useTheme } from "@/components/common/hooks/useTheme";
import { dark } from "@/theme";

export type CallShellProps = {
  /** The avatar, centred. */
  children: ReactNode;
  name: string;
  /** "Ringing…", "02:14", "Call ended". */
  status: string;
  /** Mute / speaker / end. */
  controls: ReactNode;
};

export function CallShell({ children, name, status, controls }: CallShellProps) {
  const theme = useTheme();

  return (
    <Box style={{ flex: 1, backgroundColor: dark.color.background }}>
      <SafeArea style={{ flex: 1 }}>
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
