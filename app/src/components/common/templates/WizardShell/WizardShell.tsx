/**
 * One question, one screen.
 *
 * The frame for all seven onboarding steps. The uniformity is the point — the
 * user should feel the same shape each step so only the question changes.
 *
 * The header is a single row: back chevron, segmented progress, "Step 4 of 7".
 * That is what the design specifies, and it differs from `ScreenShell`'s header
 * enough that this template owns its own rather than bending that one.
 */

import type { ReactNode } from "react";

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Heading } from "@/components/common/atoms/Heading";
import { Icon } from "@/components/common/atoms/Icon";
import { KeyboardAware } from "@/components/common/atoms/KeyboardAware";
import { SafeArea } from "@/components/common/atoms/SafeArea";
import { Scroller } from "@/components/common/atoms/Scroller";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { WizardProgress } from "@/components/common/molecules/WizardProgress";

export type WizardShellProps = {
  children: ReactNode;
  /** 1-based. */
  step: number;
  total: number;
  question: string;
  hint?: string;
  onBack?: () => void;
  footer?: ReactNode;
  /** Let the content own the scroll (the interest picker does). */
  scroll?: boolean;
};

export function WizardShell({
  children,
  step,
  total,
  question,
  hint,
  onBack,
  footer,
  scroll = true,
}: WizardShellProps) {
  const theme = useTheme();

  const head = (
    <Box style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.xl }}>
      <Heading level="display">{question}</Heading>
      {hint ? (
        <Body color="textSecondary" style={{ fontSize: 16, lineHeight: 24 }}>
          {hint}
        </Body>
      ) : null}
    </Box>
  );

  const body = (
    <>
      {head}
      {children}
    </>
  );

  return (
    <SafeArea
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.color.background }}
    >
      <KeyboardAware style={{ flex: 1 }}>
        <Box
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.sm,
            minHeight: 44,
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

          <Box style={{ flex: 1 }}>
            <WizardProgress step={step} total={total} />
          </Box>

          <Caption color="textSecondary">{`Step ${step} of ${total}`}</Caption>
        </Box>

        {scroll ? (
          <Scroller
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.xl,
              paddingBottom: theme.spacing.xl,
              gap: theme.spacing.xl,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </Scroller>
        ) : (
          <Box
            style={{
              flex: 1,
              paddingHorizontal: theme.spacing.xl,
              gap: theme.spacing.xl,
            }}
          >
            {body}
          </Box>
        )}

        {footer ? (
          <Box
            style={{
              paddingHorizontal: theme.spacing.xl,
              paddingBottom: theme.spacing.xl,
              paddingTop: theme.spacing.md,
              gap: theme.spacing.sm,
            }}
          >
            {footer}
          </Box>
        ) : null}
      </KeyboardAware>
    </SafeArea>
  );
}
