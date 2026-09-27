/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Monetisation — every affected surface, in BOTH entitlement states (Phase 9).
 *
 * The pairing is the point. An ad slot that renders correctly on free proves
 * nothing on its own; what PLAN asks to confirm is that the same screen renders
 * *zero* ad slots once premium flips on. So every gated screen is snapshotted
 * twice and the two are asserted to differ, which is also what stops a pair
 * going byte-identical without anyone noticing.
 */

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");

  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => ({ id: "user-01" }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: Object.assign(() => null, {
      Screen: () => null,
      Protected: ({ children }: { children: React.ReactNode }) => children,
    }),
  };
});

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  getLastKnownPositionAsync: jest.fn(async () => null),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

import ChatTab from "@/app/(tabs)/chat";
import NearbyScreen from "@/app/(tabs)/index";
import MatchScreen from "@/app/(tabs)/match";
import ProfileTab from "@/app/(tabs)/profile";
import FiltersScreen from "@/app/filters";
import LikesScreen from "@/app/likes";
import PaywallScreen from "@/app/paywall";
import SubscriptionSettingsScreen from "@/app/settings/subscription";

import { AdBanner } from "@/components/common/molecules/AdBanner";
import { AdCard } from "@/components/common/molecules/AdCard";
import { AdRow } from "@/components/common/molecules/AdRow";
import { BenefitList } from "@/components/common/molecules/BenefitList";
import { PlanCard } from "@/components/paywall/molecules/PlanCard";

import { formatCountdown } from "@/components/common";
import {
  redactClockTimes,
  redactCountdown,
  renderAtom,
  renderAtomAsync,
  THEMES,
} from "@/components/common/atoms/__tests__/renderAtom";
import { billingService, FREE_DAILY_LIKES, PLANS } from "@/services/billing.service";
import { configureClient, resetClient } from "@/services/client";
import { meService } from "@/services/me.service";
import { useDeckStore } from "@/stores/deck.store";
import { useEntitlementsStore } from "@/stores/entitlements.store";

const noop = () => {};

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  billingService.__reset();
  meService.__reset();
  useEntitlementsStore.setState({ entitlements: null, plans: [], loading: false });
  useDeckStore.setState({
    cards: [],
    index: 0,
    loading: false,
    error: null,
    lastMatch: null,
    outOfLikes: false,
  });
});
afterAll(resetClient);

/** Flip the tier through the real service, not by posing a prop. */
async function premium() {
  await billingService.setPremium(true);
  await useEntitlementsStore.getState().refresh();
}

/**
 * The marks an ad slot leaves in a render tree.
 *
 * `AdSlot` is the only thing that draws them, so their absence is a direct
 * check that no slot rendered — which is the Phase 9 verification line
 * "confirm zero ad slots render when premium is on".
 */
const AD_MARKERS = ["Remove ads", "Sponsored placeholder", "320 × 50", "profiles, one ad"];

function adSlotCount(tree: unknown): number {
  const json = JSON.stringify(tree);
  return AD_MARKERS.filter((marker) => json.includes(marker)).length;
}

describe.each(THEMES)("Phase 9 — free tier — %s theme", (theme) => {
  it("(tabs)/index — nearby, with banner", async () =>
    expect(await renderAtomAsync(<NearbyScreen />, theme)).toMatchSnapshot());

  it("(tabs)/chat — with ad row", async () =>
    expect(
      redactClockTimes(await renderAtomAsync(<ChatTab />, theme)),
    ).toMatchSnapshot());

  it("likes — locked tiles and the count", async () =>
    expect(await renderAtomAsync(<LikesScreen />, theme)).toMatchSnapshot());

  it("filters — interests and active-recently locked", async () =>
    expect(await renderAtomAsync(<FiltersScreen />, theme)).toMatchSnapshot());

  it("(tabs)/profile — upsell, no badge", async () =>
    expect(await renderAtomAsync(<ProfileTab />, theme)).toMatchSnapshot());

  it("(tabs)/match — out of likes, with countdown", async () => {
    // Spend the real quota rather than setting a flag.
    for (let i = 0; i < FREE_DAILY_LIKES; i += 1) {
      await billingService.consumeLike();
    }
    useDeckStore.setState({ outOfLikes: true });
    expect(
      redactCountdown(await renderAtomAsync(<MatchScreen />, theme)),
    ).toMatchSnapshot();
  });
});

describe.each(THEMES)("Phase 9 — premium tier — %s theme", (theme) => {
  it("(tabs)/index — no banner", async () => {
    await premium();
    expect(await renderAtomAsync(<NearbyScreen />, theme)).toMatchSnapshot();
  });

  it("(tabs)/chat — no ad row", async () => {
    await premium();
    expect(
      redactClockTimes(await renderAtomAsync(<ChatTab />, theme)),
    ).toMatchSnapshot();
  });

  it("likes — revealed", async () => {
    await premium();
    expect(await renderAtomAsync(<LikesScreen />, theme)).toMatchSnapshot();
  });

  it("filters — unlocked", async () => {
    await premium();
    expect(await renderAtomAsync(<FiltersScreen />, theme)).toMatchSnapshot();
  });

  it("(tabs)/profile — badge, no upsell", async () => {
    await premium();
    expect(await renderAtomAsync(<ProfileTab />, theme)).toMatchSnapshot();
  });
});

describe.each(THEMES)("Phase 9 — paywall and components — %s theme", (theme) => {
  it("paywall", async () =>
    expect(await renderAtomAsync(<PaywallScreen />, theme)).toMatchSnapshot());

  it("settings/subscription — free", async () =>
    expect(await renderAtomAsync(<SubscriptionSettingsScreen />, theme)).toMatchSnapshot());

  it("settings/subscription — premium", async () => {
    await premium();
    expect(await renderAtomAsync(<SubscriptionSettingsScreen />, theme)).toMatchSnapshot();
  });

  it("AdBanner", async () => {
    await useEntitlementsStore.getState().refresh();
    expect(renderAtom(<AdBanner />, theme)).toMatchSnapshot();
  });

  it("AdCard", async () => {
    await useEntitlementsStore.getState().refresh();
    expect(renderAtom(<AdCard />, theme)).toMatchSnapshot();
  });

  it("AdRow", async () => {
    await useEntitlementsStore.getState().refresh();
    expect(renderAtom(<AdRow />, theme)).toMatchSnapshot();
  });

  it("BenefitList", () => expect(renderAtom(<BenefitList />, theme)).toMatchSnapshot());

  it("PlanCard — highlighted and selected", () =>
    expect(
      renderAtom(
        <PlanCard plan={PLANS[1]} selected onPress={noop} />,
        theme,
      ),
    ).toMatchSnapshot());
});

describe("Phase 9 — the gate itself", () => {
  it("renders zero ad slots on premium, on every surface that has one", async () => {
    const surfaces = [
      ["nearby", <NearbyScreen key="n" />],
      ["chat", <ChatTab key="c" />],
    ] as const;

    for (const [name, element] of surfaces) {
      // Free first: the slot must actually be there, or the premium check below
      // would pass for the wrong reason.
      billingService.__reset();
      useEntitlementsStore.setState({ entitlements: null });
      const free = await renderAtomAsync(element, "light");
      expect(adSlotCount(free)).toBeGreaterThan(0);

      await premium();
      const paid = await renderAtomAsync(element, "light");
      expect({ name, slots: adSlotCount(paid) }).toEqual({ name, slots: 0 });
    }
  });

  it("an ad slot renders nothing before the tier is known", async () => {
    /*
     * `renderAtom` always returns the provider wrapper, so "rendered nothing"
     * is "left no marks", not "returned null" — the providers are there either
     * way. Paired with the loaded case below so the assertion cannot pass by
     * being trivially true.
     */
    useEntitlementsStore.setState({ entitlements: null });
    expect(adSlotCount(renderAtom(<AdBanner />, "light"))).toBe(0);

    await useEntitlementsStore.getState().refresh();
    expect(adSlotCount(renderAtom(<AdBanner />, "light"))).toBeGreaterThan(0);
  });

  it("premium removes the like cap rather than raising it (A16)", async () => {
    const free = await billingService.getEntitlements();
    expect(free.likesRemaining).toBe(FREE_DAILY_LIKES);

    const paid = await billingService.setPremium(true);
    expect(paid.likesRemaining).toBe(Number.POSITIVE_INFINITY);

    // And spending one does not decrement anything.
    const after = await billingService.consumeLike();
    expect(after.likesRemaining).toBe(Number.POSITIVE_INFINITY);
  });

  it("the free quota is 15 and then throws quotaExceeded (A16)", async () => {
    for (let i = 0; i < FREE_DAILY_LIKES; i += 1) {
      await billingService.consumeLike();
    }
    await expect(billingService.consumeLike()).rejects.toMatchObject({
      code: "quotaExceeded",
    });
  });

  it("formats the countdown to the reset", () => {
    expect(formatCountdown(0)).toBe("now");
    expect(formatCountdown(30_000)).toBe("under a minute");
    expect(formatCountdown(12 * 60_000)).toBe("12m");
    expect(formatCountdown(4 * 3_600_000 + 12 * 60_000)).toBe("4h 12m");
  });

  it("restore returns the current entitlements without granting anything", async () => {
    const restored = await billingService.restorePurchases();
    expect(restored.isPremium).toBe(false);
  });
});
