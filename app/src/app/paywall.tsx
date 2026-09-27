import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Body,
  Box,
  Button,
  Caption,
  Heading,
  SheetShell,
  Tappable,
  useEntitlements,
  useTheme,
} from "@/components/common";
import { BenefitList } from "@/components/common/molecules/BenefitList";
import { PlanCard } from "@/components/paywall/molecules/PlanCard";
import { copy } from "@/copy";
import { useEntitlementsStore } from "@/stores/entitlements.store";

/**
 * The paywall.
 *
 * Reached from every ad slot, the blurred likes grid, the out-of-likes state,
 * the locked filters and the profile — one sheet, five doors.
 *
 * **R13: this will not pass App Store review as it stands.** Real in-app
 * purchase, stated renewal terms, a price that is not invented and a working
 * Restore are all required. The `terms` line says so in the UI rather than
 * leaving a reviewer to discover it.
 *
 * `Continue` does not purchase anything (A15). It flips the session toggle, so
 * a demo can show both tiers without a billing provider.
 */
export default function PaywallScreen() {
  const theme = useTheme();
  const { isPremium } = useEntitlements();

  const plans = useEntitlementsStore((state) => state.plans);
  const loadPlans = useEntitlementsStore((state) => state.loadPlans);
  const setPremium = useEntitlementsStore((state) => state.setPremium);
  const restore = useEntitlementsStore((state) => state.restore);

  /**
   * Null until the user picks, then their choice.
   *
   * The default is *derived* below rather than written into state by an effect.
   * `react-hooks/set-state-in-effect` forbids the effect version, correctly:
   * setting state synchronously from one causes a second render pass, and here
   * it would also fight the user if the plans ever reloaded under them.
   */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);


  const defaultPlan = plans.find((plan) => plan.highlighted) ?? plans[0];
  const activeId = selectedId ?? defaultPlan?.id ?? null;

  async function subscribe() {
    setBusy(true);
    try {
      await setPremium(true);
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SheetShell
      footer={
        <>
          <Button
            label={copy.premium.cta}
            onPress={() => void subscribe()}
            disabled={!activeId || isPremium}
            loading={busy}
          />

          <Box style={{ alignItems: "center", paddingTop: theme.spacing.xs }}>
            <Tappable
              onPress={() => void restore()}
              accessibilityRole="button"
              accessibilityLabel={copy.premium.restore}
              hitSlop={12}
            >
              <Caption color="textSecondary" style={{ textDecorationLine: "underline" }}>
                {copy.premium.restore}
              </Caption>
            </Tappable>
          </Box>
        </>
      }
    >
        <Box style={{ gap: theme.spacing.xs }}>
          <Heading level="display">{copy.premium.title}</Heading>
          <Body color="textSecondary" style={{ fontSize: 16, lineHeight: 24 }}>
            {copy.premium.subtitle}
          </Body>
        </Box>

        <BenefitList />

        <Box style={{ gap: theme.spacing.sm }}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={plan.id === activeId}
              onPress={() => setSelectedId(plan.id)}
            />
          ))}
        </Box>

        {/* R13 in the UI, not just in a comment. */}
        <Caption style={{ textAlign: "center" }}>{copy.premium.terms}</Caption>
    </SheetShell>
  );
}
