/**
 * "Step 4 of 7", as a bar.
 *
 * Segments rather than a continuous fill, so the seven onboarding steps are
 * countable at a glance — a user deciding whether to finish signup wants to
 * know how much is left, not roughly what fraction is done.
 */

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";

export type WizardProgressProps = {
  /** 1-based. */
  step: number;
  total: number;
};

export function WizardProgress({ step, total }: WizardProgressProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={{ flexDirection: "row", gap: theme.spacing.xs }}
    >
      {Array.from({ length: total }, (_, index) => (
        <Box
          key={index}
          style={{
            flex: 1,
            height: 4,
            borderRadius: theme.radius.pill,
            backgroundColor:
              index < step ? theme.color.accent : theme.color.surfaceSunken,
          }}
        />
      ))}
    </Box>
  );
}
