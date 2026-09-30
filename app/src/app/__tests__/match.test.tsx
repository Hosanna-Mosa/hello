/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Render-tree snapshots for the match deck (PLAN Phase 6).
 *
 * The deck's states are driven through the real store with the mock client at
 * zero latency, so "out of cards" and "out of likes" are the genuine states the
 * app reaches rather than props posed to look like them.
 */

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: "user-01" }),
  Stack: Object.assign(() => null, {
    Screen: () => null,
    Protected: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

import MatchScreen from "@/app/(tabs)/match";
import LikeNoteScreen from "@/app/like-note/[id]";
import MatchedScreen from "@/app/matched/[id]";

import { DeckActions } from "@/components/match/molecules/DeckActions";
import { DeckSkeleton } from "@/components/match/molecules/DeckSkeleton";
import { SwipeCard, type SwipeCardPerson } from "@/components/match/organisms/SwipeCard";

import {
  redactCountdown,
  renderAtom,
  renderAtomAsync,
  THEMES,
} from "@/components/common/atoms/__tests__/renderAtom";
import { billingService, FREE_DAILY_LIKES } from "@/services/billing.service";
import { configureClient, resetClient } from "@/services/client";
import { likesService } from "@/services/likes.service";
import { useDeckStore } from "@/stores/deck.store";

const PERSON: SwipeCardPerson = {
  id: "user-01",
  name: "Karthik",
  age: 29,
  distanceMetres: 4000,
  bio: "Always up for a good coffee, weekend hikes and spontaneous plans.",
  interests: [
    { id: "travel", label: "Travel", category: "outdoors" },
    { id: "coffee", label: "Coffee", category: "food" },
    { id: "photography", label: "Photography", category: "creative" },
    { id: "hiking", label: "Hiking", category: "outdoors" },
  ],
};

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  billingService.__reset();
  likesService.__reset();
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

const noop = () => {};

describe.each(THEMES)("Phase 6 — match deck — %s theme", (theme) => {
  it("(tabs)/match — deck with cards", async () =>
    expect(await renderAtomAsync(<MatchScreen />, theme)).toMatchSnapshot());

  it("(tabs)/match — out of cards", async () => {
    // A real empty result, not a posed prop: filter to something nobody matches.
    useDeckStore.setState({ cards: [], index: 0, loading: false });
    expect(await renderAtomAsync(<MatchScreen />, theme)).toMatchSnapshot();
  });

  it("(tabs)/match — error + retry", async () => {
    configureClient({ failureMode: "server" });
    expect(await renderAtomAsync(<MatchScreen />, theme)).toMatchSnapshot();
  });

  it("(tabs)/match — out of likes (A16)", async () => {
    // Spend the real daily quota rather than setting a flag.
    for (let i = 0; i < FREE_DAILY_LIKES; i += 1) {
      await billingService.consumeLike();
    }
    useDeckStore.setState({ outOfLikes: true });
    // The screen now counts down to the quota reset, which moves every run.
    expect(
      redactCountdown(await renderAtomAsync(<MatchScreen />, theme)),
    ).toMatchSnapshot();
  });

  it("like-note/[id]", async () =>
    expect(await renderAtomAsync(<LikeNoteScreen />, theme)).toMatchSnapshot());

  it("matched/[id] — It's a Connect", async () =>
    expect(await renderAtomAsync(<MatchedScreen />, theme)).toMatchSnapshot());

  it("(tabs)/match — loading skeleton", () =>
    expect(renderAtom(<DeckSkeleton />, theme)).toMatchSnapshot());

  it("SwipeCard", () =>
    expect(renderAtom(<SwipeCard person={PERSON} />, theme)).toMatchSnapshot());

  it("DeckActions", () =>
    expect(
      renderAtom(<DeckActions onPass={noop} onLike={noop} onNote={noop} />, theme),
    ).toMatchSnapshot());

  it("DeckActions disabled", () =>
    expect(
      renderAtom(<DeckActions onPass={noop} onLike={noop} onNote={noop} disabled />, theme),
    ).toMatchSnapshot());
});

describe("Match tab reloads when filters change (PLAN #249)", () => {
  it("applying new filters re-queries the deck — it is not loaded only once", async () => {
    const { profilesService } = jest.requireActual<typeof import("@/services/profiles.service")>(
      "@/services/profiles.service",
    );
    const { useFiltersStore } = jest.requireActual<typeof import("@/stores/filters.store")>(
      "@/stores/filters.store",
    );
    const TestRenderer = jest.requireActual<typeof import("react-test-renderer")>("react-test-renderer");
    const spy = jest.spyOn(profilesService, "listNearby");
    const flush = () =>
      TestRenderer.act(async () => {
        for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0));
      });

    let renderer!: import("react-test-renderer").ReactTestRenderer;
    await TestRenderer.act(async () => {
      const { SafeAreaProvider } = jest.requireActual<typeof import("react-native-safe-area-context")>(
        "react-native-safe-area-context",
      );
      const { ThemeProvider } = jest.requireActual<typeof import("@/theme/ThemeProvider")>("@/theme/ThemeProvider");
      renderer = TestRenderer.create(
        <SafeAreaProvider
          initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}
        >
          <ThemeProvider override="light">
            <MatchScreen />
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    });
    await flush();
    const before = spy.mock.calls.length;
    expect(before).toBeGreaterThan(0);

    await TestRenderer.act(async () => useFiltersStore.getState().setDistance(100_000));
    await flush();

    expect(spy.mock.calls.length).toBeGreaterThan(before);
    expect(spy.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ maxDistanceMetres: 100_000 }));

    await TestRenderer.act(async () => {
      renderer.unmount();
      useFiltersStore.getState().reset();
    });
    spy.mockRestore();
  });
});
