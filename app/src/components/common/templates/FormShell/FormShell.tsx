/**
 * A screen you type into.
 *
 * Keyboard avoidance plus a footer that stays pinned above it. Without this the
 * submit button hides under the keyboard on the one screen where it matters
 * most, and the fix differs per platform.
 */

import type { ReactNode } from "react";

import { Box } from "@/components/common/atoms/Box";
import { KeyboardAware } from "@/components/common/atoms/KeyboardAware";
import { Scroller } from "@/components/common/atoms/Scroller";
import { useTheme } from "@/components/common/hooks/useTheme";
import { ScreenShell } from "@/components/common/templates/ScreenShell";

export type FormShellProps = {
  children: ReactNode;
  title?: string;
  onBack?: () => void;
  /** Pinned above the keyboard — usually the primary Button. */
  footer?: ReactNode;
};

export function FormShell({ children, title, onBack, footer }: FormShellProps) {
  const theme = useTheme();

  return (
    <ScreenShell title={title} onBack={onBack} edges={["top", "left", "right"]}>
      <KeyboardAware style={{ flex: 1 }}>
        <Scroller
          contentContainerStyle={{
            padding: theme.spacing.xl,
            gap: theme.spacing.lg,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Scroller>

        {footer ? (
          <Box
            style={{
              padding: theme.spacing.xl,
              paddingBottom: theme.spacing.xxl,
              gap: theme.spacing.sm,
            }}
          >
            {footer}
          </Box>
        ) : null}
      </KeyboardAware>
    </ScreenShell>
  );
}
