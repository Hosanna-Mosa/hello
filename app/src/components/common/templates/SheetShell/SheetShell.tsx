/**
 * The inside of a form sheet.
 *
 * Pairs with expo-router's `presentation: 'formSheet'` and
 * `sheetAllowedDetents`, which are native and need no bottom-sheet library
 * (PLAN §2). This draws only what goes *inside* the sheet: grabber, title,
 * optional reset action, content, and a pinned footer.
 */

import type { ReactNode } from "react";

import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Label } from "@/components/common/atoms/Label";
import { Scroller } from "@/components/common/atoms/Scroller";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SheetShellProps = {
  children: ReactNode;
  title?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  footer?: ReactNode;
  /** iOS draws its own grabber; set false when the OS already shows one. */
  showGrabber?: boolean;
  /**
   * Let the sheet be as tall as what is in it.
   *
   * Pairs with `sheetAllowedDetents: "fitToContents"` and is required for it
   * to do anything: the default shell is `flex: 1` around a scroller, so it
   * always measures as "whatever height you gave me" and the sheet has
   * nothing to shrink to. A single numeric detent will not do instead —
   * react-native-screens sets `isFitToContents` on the behaviour either way,
   * but a `flex: 1` child still fills whatever it is offered.
   *
   * Drops the scroller with it, since a scroller has no natural height
   * either. Safe only where content is bounded — this product has no
   * photographs, a 300-character bio cap and at most ten interests. Do not
   * set it on a sheet whose content can run long.
   */
  fitToContents?: boolean;
};

export function SheetShell({
  children,
  title,
  actionLabel,
  onActionPress,
  footer,
  showGrabber = true,
  fitToContents = false,
}: SheetShellProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        ...(fitToContents ? {} : { flex: 1 }),
        backgroundColor: theme.color.surfaceElevated,
      }}
    >
      {showGrabber ? (
        <Box style={{ alignItems: "center", paddingTop: theme.spacing.sm }}>
          <Box
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              width: 36,
              height: 4,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.color.borderStrong,
            }}
          />
        </Box>
      ) : null}

      {title ? (
        <Box
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
          }}
        >
          <Heading level="title">{title}</Heading>

          {actionLabel && onActionPress ? (
            <Tappable
              onPress={onActionPress}
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              hitSlop={12}
            >
              <Label color="accent">{actionLabel}</Label>
            </Tappable>
          ) : null}
        </Box>
      ) : null}

      {fitToContents ? (
        <Box
          style={{
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.lg,
          }}
        >
          {children}
        </Box>
      ) : (
        <Scroller
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.lg,
          }}
        >
          {children}
        </Scroller>
      )}

      {footer ? (
        <Box style={{ padding: theme.spacing.xl, gap: theme.spacing.sm }}>{footer}</Box>
      ) : null}
    </Box>
  );
}
