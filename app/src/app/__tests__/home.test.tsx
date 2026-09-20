/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Render-tree snapshots for every Phase 5 screen AND every state.
 *
 * Latency is zeroed so the real content renders rather than a permanent
 * loading state, and failure injection is used to reach the error state — the
 * same dev switch the app itself exposes.
 */

jest.mock("expo-router", () => {
  // `useFocusEffect` is a plain effect here: the test renderer never blurs, so
  // "runs on focus" and "runs on mount" are the same thing.
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

const permissionState = { granted: true, canAskAgain: true };
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => permissionState),
  requestForegroundPermissionsAsync: jest.fn(async () => permissionState),
  getLastKnownPositionAsync: jest.fn(async () => null),
}));

import NearbyScreen from "@/app/(tabs)/index";
import ChatTab from "@/app/(tabs)/chat";
import MatchTab from "@/app/(tabs)/match";
import ProfileTab from "@/app/(tabs)/profile";
import FiltersScreen from "@/app/filters";
import FilterGendersScreen from "@/app/filters/genders";
import FilterInterestsScreen from "@/app/filters/interests";
import LikesScreen from "@/app/likes";
import NotificationsScreen from "@/app/notifications";
import SearchScreen from "@/app/search";
import UserProfileScreen from "@/app/user/[id]";

import { EmptyNearby } from "@/components/home/EmptyNearby";
import { HomeHeader } from "@/components/home/HomeHeader";
import { LocationChip } from "@/components/home/LocationChip";
import { LocationDenied } from "@/components/home/LocationDenied";
import { NearbySkeleton } from "@/components/home/NearbySkeleton";

import { renderAtom, renderAtomAsync, THEMES } from "@/components/common/atoms/__tests__/renderAtom";
import { billingService } from "@/services/billing.service";
import { configureClient, resetClient } from "@/services/client";
import { useEntitlementsStore } from "@/stores/entitlements.store";
import { safetyService } from "@/services/safety.service";

beforeEach(() => {
  // Entitlements are global and every surface now reads them: without this a
  // suite that flips premium leaves the next one rendering no ad slots.
  billingService.__reset();
  useEntitlementsStore.setState({ entitlements: null, plans: [], loading: false });
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  safetyService.__reset();
  permissionState.granted = true;
  permissionState.canAskAgain = true;
});
afterAll(resetClient);

const noop = () => {};

describe.each(THEMES)("Phase 5 — Home — %s theme", (theme) => {
  // ---------- screens, with content ----------
  it("(tabs)/index — nearby grid", async () =>
    expect(await renderAtomAsync(<NearbyScreen />, theme)).toMatchSnapshot());

  it("search — empty query", async () =>
    expect(await renderAtomAsync(<SearchScreen />, theme)).toMatchSnapshot());

  it("likes", async () =>
    expect(await renderAtomAsync(<LikesScreen />, theme)).toMatchSnapshot());

  it("notifications", async () =>
    expect(await renderAtomAsync(<NotificationsScreen />, theme)).toMatchSnapshot());

  it("filters", async () =>
    expect(await renderAtomAsync(<FiltersScreen />, theme)).toMatchSnapshot());

  it("filters/interests", async () =>
    expect(await renderAtomAsync(<FilterInterestsScreen />, theme)).toMatchSnapshot());

  it("filters/genders", async () =>
    expect(await renderAtomAsync(<FilterGendersScreen />, theme)).toMatchSnapshot());

  it("user/[id]", async () =>
    expect(await renderAtomAsync(<UserProfileScreen />, theme)).toMatchSnapshot());

  // ---------- tab placeholders ----------
  it("(tabs)/match placeholder", () =>
    expect(renderAtom(<MatchTab />, theme)).toMatchSnapshot());
  it("(tabs)/chat placeholder", async () =>
    expect(await renderAtomAsync(<ChatTab />, theme)).toMatchSnapshot());
  it("(tabs)/profile placeholder", async () =>
    expect(await renderAtomAsync(<ProfileTab />, theme)).toMatchSnapshot());

  // ---------- states ----------
  it("nearby — loading skeletons", () =>
    expect(renderAtom(<NearbySkeleton />, theme)).toMatchSnapshot());

  it("nearby — error + retry", async () => {
    configureClient({ failureMode: "server" });
    expect(await renderAtomAsync(<NearbyScreen />, theme)).toMatchSnapshot();
  });

  it("nearby — location denied (can ask again)", () =>
    expect(
      renderAtom(
        <LocationDenied
          blocked={false}
          onAllowPress={noop}
          onOpenSettings={noop}
          onEnterCityPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("nearby — location blocked (settings only)", () =>
    expect(
      renderAtom(
        <LocationDenied
          blocked
          onAllowPress={noop}
          onOpenSettings={noop}
          onEnterCityPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("nearby — empty (design illustration + two actions)", () =>
    expect(
      renderAtom(<EmptyNearby onAdjustFilters={noop} onRetry={noop} />, theme),
    ).toMatchSnapshot());

  it("location chip — no city", () =>
    expect(renderAtom(<LocationChip onPress={noop} />, theme)).toMatchSnapshot());

  it("location chip — with city", () =>
    expect(renderAtom(<LocationChip city="Rajahmundry" onPress={noop} />, theme)).toMatchSnapshot());

  it("home header", () =>
    expect(
      renderAtom(
        <HomeHeader
          likeCount={12}
          onSearchPress={noop}
          onLikesPress={noop}
          onFiltersPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("home header — no likes", () =>
    expect(
      renderAtom(
        <HomeHeader
          likeCount={0}
          onSearchPress={noop}
          onLikesPress={noop}
          onFiltersPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());
});
