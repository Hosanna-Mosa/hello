/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * "You liked" — the people you liked, and where each one stands (PLAN #247).
 */

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

import { router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TestRenderer from "react-test-renderer";

import SentLikesScreen from "@/app/likes/sent";
import { SentLikeRow } from "@/components/likes/organisms/SentLikeRow";
import { billingService } from "@/services/billing.service";
import { configureClient, resetClient } from "@/services/client";
import { likesService } from "@/services/likes.service";
import { matchesService } from "@/services/matches.service";
import { ThemeProvider } from "@/theme/ThemeProvider";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider override="light">
          <SentLikesScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  await TestRenderer.act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0));
  });
  return renderer;
}

const rows = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAllByType(SentLikeRow).map((row) => ({ name: row.props.name, status: row.props.statusLabel }));

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  billingService.__reset();
  likesService.__reset();
  matchesService.__reset();
  jest.mocked(router.push).mockClear();
});
afterAll(resetClient);

describe("You liked", () => {
  it("is empty — with a way to go find people — before you like anyone", async () => {
    const r = await render();
    expect(rows(r)).toEqual([]);
    expect(JSON.stringify(r.toJSON())).toContain("You haven't liked anyone yet");
  });

  it("lists everyone you liked with where it stands, and a row opens the profile", async () => {
    await likesService.sendLike("user-20");
    await likesService.sendLike("user-21", "Chess sometime?");
    await likesService.sendLike("user-17", "Hi!"); // they already liked you → connected

    const r = await render();
    const statuses = rows(r).map((row) => row.status);
    expect(statuses).toHaveLength(3);
    expect(statuses).toEqual(
      expect.arrayContaining(["Liked", "Request sent", "Connected · you can message"]),
    );

    await TestRenderer.act(async () => r.root.findAllByType(SentLikeRow)[0]?.props.onPress());
    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/user/[id]" }));
  });
});
