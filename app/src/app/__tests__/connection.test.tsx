/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * The profile sheet's footer walks the connection states — and "Message" only
 * ever appears once the other person has said yes (PLAN §1, match-gated).
 */

const params = { id: "user-01" };
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => params,
}));

import { router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TestRenderer from "react-test-renderer";

import UserProfileScreen from "@/app/user/[id]";
import { Button } from "@/components/common/molecules/Button";
import { billingService } from "@/services/billing.service";
import { configureClient, resetClient } from "@/services/client";
import { likesService } from "@/services/likes.service";
import { matchesService } from "@/services/matches.service";
import { ThemeProvider } from "@/theme/ThemeProvider";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const settle = () =>
  TestRenderer.act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0));
  });

async function open(id: string) {
  params.id = id;
  let renderer!: TestRenderer.ReactTestRenderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider override="light">
          <UserProfileScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  await settle();
  return renderer;
}

const labels = (r: TestRenderer.ReactTestRenderer) =>
  r.root.findAllByType(Button).map((b) => b.props.label as string);

const press = async (r: TestRenderer.ReactTestRenderer, label: string) => {
  const button = r.root.findAllByType(Button).find((b) => b.props.label === label);
  if (!button) throw new Error(`No "${label}" button — have: ${labels(r).join(", ")}`);
  await TestRenderer.act(async () => button.props.onPress());
  await settle();
};

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  billingService.__reset();
  likesService.__reset();
  matchesService.__reset();
  jest.mocked(router.push).mockClear();
});
afterAll(resetClient);

describe("profile sheet — connection actions", () => {
  it("matched → Message opens the thread; no Done, no request", async () => {
    const r = await open("user-01");
    expect(labels(r)).toEqual(["Message"]);

    await press(r, "Message");
    expect(router.push).toHaveBeenCalledWith({ pathname: "/thread/[id]", params: { id: "thread-1" } });
  });

  it("no connection → Send request, never Message", async () => {
    const r = await open("user-20");
    expect(labels(r)).toEqual(["Send request"]);

    await press(r, "Send request");
    expect(labels(r)).toEqual(["Send"]);

    await press(r, "Send");
    expect(labels(r)).toEqual(["Request sent"]);
    expect(r.root.findAllByType(Button)[0]?.props.disabled).toBe(true);

    // Re-opening reads the same state from the service, not local memory.
    const again = await open("user-20");
    expect(labels(again)).toEqual(["Request sent"]);
  });

  it("a silent like from them is not revealed — still Send request", async () => {
    const r = await open("user-12");
    expect(labels(r)).toEqual(["Send request"]);
  });

  it("incoming request → Accept → Message", async () => {
    const r = await open("user-09");
    expect(labels(r)).toEqual(["Accept request"]);

    await press(r, "Accept request");
    expect(labels(r)).toEqual(["Message"]);
  });

  it("they already liked you → sending the request matches straight away", async () => {
    const r = await open("user-17");
    await press(r, "Send request");
    await press(r, "Send");
    expect(labels(r)).toEqual(["Message"]);
  });
});
