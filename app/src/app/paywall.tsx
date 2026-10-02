import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

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
import { isMockMode } from "@/services/client";
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
  const purchase = useEntitlementsStore((state) => state.purchase);
  const checkPurchase = useEntitlementsStore((state) => state.checkPurchase);
  const pendingOrderId = useEntitlementsStore((state) => state.pendingOrderId);
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);


  const defaultPlan = plans.find((plan) => plan.highlighted) ?? plans[0];
  const activeId = selectedId ?? defaultPlan?.id ?? null;

  async function subscribe() {
    if (!activeId) return;
    setBusy(true);
    setError(null);
    try {
      // Live: opens Razorpay in the browser and returns "pending". Mock: the
      // demo grants at once and returns "premium".
      if ((await purchase(activeId)) === "premium") router.back();
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : copy.premium.purchaseUnavailable);
    } finally {
      setBusy(false);
    }
  }

  /** Asks the server whether the pending payment went through. */
  async function confirmPayment() {
    setBusy(true);
    setError(null);
    try {
      const outcome = await checkPurchase();
      if (outcome === "paid") router.back();
      else if (outcome === "closed") setError(copy.premium.paymentClosed);
      else setError(copy.premium.paymentPending);
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : copy.premium.paymentPending);
    } finally {
      setBusy(false);
    }
  }

  // Coming back from Razorpay's page is the moment to check — no polling loop.
  useEffect(() => {
    if (!pendingOrderId) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void confirmPayment();
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOrderId]);

  return (
    <SheetShell
      footer={
        <>
          {error ? (
            <Caption color="danger" style={{ textAlign: "center" }}>
              {error}
            </Caption>
          ) : null}

          {pendingOrderId ? (
            <Button label={copy.premium.paymentCheck} onPress={() => void confirmPayment()} loading={busy} />
          ) : (
            <Button
              label={copy.premium.cta}
              onPress={() => void subscribe()}
              disabled={!activeId || isPremium}
              loading={busy}
            />
          )}

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
        <Caption style={{ textAlign: "center" }}>
          {isMockMode() ? copy.premium.terms : copy.premium.termsLive}
        </Caption>
    </SheetShell>
  );
}
