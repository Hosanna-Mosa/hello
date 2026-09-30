/**
 * The inside of a form sheet.
 *
 * Pairs with expo-router's `presentation: 'formSheet'` and
 * `sheetAllowedDetents`, which are native and need no bottom-sheet library
 * (PLAN §2). This draws only what goes *inside* the sheet: grabber, title,
 * optional reset action, content, and a pinned footer.
 */

import { useRef, type ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";

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
  /**
   * Put the footer straight under the content, scrolling with it, instead of
   * pinned to the sheet's bottom edge. For a sheet whose content is usually
   * much shorter than its detent — pinned, the actions float under a big
   * empty gap.
   */
  footerInline?: boolean;
  /**
   * Called with the height the sheet NEEDS — header plus everything in the
   * scroller — once both have laid out, and again whenever it changes. Lets a
   * route size its detent to its content after layout, which is the part
   * native `fitToContents` gets wrong on SDK 54 Android (PLAN #236).
   */
  onNaturalHeight?: (height: number) => void;
};

export function SheetShell({
  children,
  title,
  actionLabel,
  onActionPress,
  footer,
  showGrabber = true,
  fitToContents = false,
  footerInline = false,
  onNaturalHeight,
}: SheetShellProps) {
  const theme = useTheme();
  // Natural height = the shell, minus the scroller's viewport, plus what the
  // scroller actually holds. Measured on views that already exist, so the
  // tree is unchanged for sheets that do not ask.
  const sizes = useRef({ shell: 0, viewport: 0, content: 0 });

  const measure = (key: "shell" | "viewport" | "content", value: number) => {
    sizes.current = { ...sizes.current, [key]: value };
    const { shell, viewport, content } = sizes.current;
    if (onNaturalHeight && shell && viewport && content) {
      onNaturalHeight(shell - viewport + content);
    }
  };

  return (
    <Box
      {...(onNaturalHeight
        ? { onLayout: (event: LayoutChangeEvent) => measure("shell", event.nativeEvent.layout.height) }
        : {})}
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
          {...(onNaturalHeight
            ? {
                onLayout: (event: LayoutChangeEvent) => measure("viewport", event.nativeEvent.layout.height),
                onContentSizeChange: (_width: number, height: number) => measure("content", height),
              }
            : {})}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.lg,
          }}
        >
          {children}
          {footer && footerInline ? (
            <Box style={{ paddingTop: theme.spacing.sm, gap: theme.spacing.sm }}>{footer}</Box>
          ) : null}
        </Scroller>
      )}

      {footer && !(footerInline && !fitToContents) ? (
        <Box style={{ padding: theme.spacing.xl, gap: theme.spacing.sm }}>{footer}</Box>
      ) : null}
    </Box>
  );
}
