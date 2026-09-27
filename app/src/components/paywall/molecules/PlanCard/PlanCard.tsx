/**
 * One placeholder plan.
 *
 * Prices are invented and say so (R13). The per-month figure is derived rather
 * than typed in, because a hand-written "only £6.67/mo" that disagrees with the
 * total is the kind of thing that ends up in a screenshot on social media.
 */

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Heading } from "@/components/common/atoms/Heading";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";
import type { Plan } from "@/services/types";

const MONTHS: Record<Plan["period"], number> = { month: 1, sixMonths: 6, year: 12 };

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
}

export type PlanCardProps = {
  plan: Plan;
  selected: boolean;
  onPress: () => void;
};

export function PlanCard({ plan, selected, onPress }: PlanCardProps) {
  const theme = useTheme();

  const months = MONTHS[plan.period];
  const perMonth = money(Math.round(plan.priceMinor / months), plan.currency);

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.label}, ${money(plan.priceMinor, plan.currency)}, ${perMonth} per month`}
      style={{
        gap: theme.spacing.xxs,
        padding: theme.spacing.lg,
        minHeight: 84,
        borderRadius: theme.radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.color.accent : theme.color.border,
        backgroundColor: selected ? theme.color.accentMuted : theme.color.surface,
      }}
    >
      {plan.highlighted ? (
        <Caption color="accent">{copy.premium.bestValue}</Caption>
      ) : null}

      <Box style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Label>{plan.label}</Label>
        <Heading level="title">{money(plan.priceMinor, plan.currency)}</Heading>
      </Box>

      <Caption>{`${perMonth} / month`}</Caption>
    </Tappable>
  );
}
