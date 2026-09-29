/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * One tap must start exactly one call.
 *
 * `call/[id].tsx` built `end` from `phase`, so every phase change rebuilt
 * `end`, which rebuilt `beginMedia`, which was a dependency of the effect that
 * CREATES the call. The instant audio connected and phase went
 * ringing → connected, that effect re-ran and sent a second `POST /calls` — so
 * the other phone rang again while its owner was already talking (PLAN #198).
 *
 * The snapshot tests could never catch it: they capture a tree and unmount
 * immediately, so the screen never lives long enough to change phase. This one
 * keeps it mounted across the transition, which is the only moment the bug
 * exists.
 *
 * Every render is unmounted in a `finally`. A failing `expect` throws, and an
 * unmount that only runs on success leaves a live CallScreen — with its own
 * pending timers — running inside the NEXT test, whose fresh spy then counts
 * the old screen's calls. Proving this against the bug is exactly when the
 * assertions fail, so this is the one test file where that matters most.
 */

const mockParams: { id: string; answered?: string; callId?: string } = { id: "thread-1" };

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");

  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: Object.assign(() => null, {
      Screen: () => null,
      Protected: ({ children }: { children: React.ReactNode }) => children,
    }),
  };
});

import TestRenderer from "react-test-renderer";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";

import CallScreen from "@/app/call/[id]";
import { callsService } from "@/services/calls.service";
import { chatService } from "@/services/chat.service";
import { configureClient, resetClient } from "@/services/client";
import { __resetActiveCall, useActiveCallStore } from "@/stores/activeCall.store";
import { ThemeProvider } from "@/theme/ThemeProvider";

const TEST_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Long enough to cross MOCK_PICKUP_MS (2200ms), which is what flips `phase`. */
const PAST_MOCK_PICKUP_MS = 2600;

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  chatService.__reset();
  callsService.__reset();
  // The call lives in a store now, and outlives any one render — so it must
  // be dropped between tests or the next one finds a call already running.
  __resetActiveCall();
  mockParams.answered = undefined;
  mockParams.callId = undefined;
});

// Clears the store's pending timers (the mock pick-up), which would otherwise
// keep Jest alive after the last test.
afterEach(() => __resetActiveCall());

async function settle(times = 8): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await TestRenderer.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe("call/[id] starts exactly one call", () => {
  it("does not start a second call when the phase changes to connected", async () => {
    const startCall = jest.spyOn(callsService, "startCall");

    let renderer!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <SafeAreaProvider initialMetrics={TEST_METRICS}>
          <ThemeProvider override="light">
            <CallScreen />
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    });

    try {
      await settle();
      expect(startCall).toHaveBeenCalledTimes(1);

      // Mock mode answers itself after MOCK_PICKUP_MS. Crossing that boundary
      // is the exact moment `phase` changed and the effect used to re-run.
      await TestRenderer.act(async () => {
        await new Promise((resolve) => setTimeout(resolve, PAST_MOCK_PICKUP_MS));
      });
      await settle();

      // Was 2 before the fix: one for the tap, one for connecting.
      expect(startCall).toHaveBeenCalledTimes(1);
    } finally {
      await TestRenderer.act(async () => {
        renderer.unmount();
      });
      startCall.mockRestore();
    }
  }, 20_000);

  it("answering an incoming call starts none of its own", async () => {
    // The callee joins the CALLER'S call. Minting a second one here is what
    // left the real caller ringing (PLAN #164), so this must stay at zero.
    mockParams.answered = "1";
    mockParams.callId = "call-from-the-caller";
    const startCall = jest.spyOn(callsService, "startCall");

    let renderer!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <SafeAreaProvider initialMetrics={TEST_METRICS}>
          <ThemeProvider override="light">
            <CallScreen />
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    });

    try {
      await settle();
      expect(startCall).not.toHaveBeenCalled();
    } finally {
      await TestRenderer.act(async () => {
        renderer.unmount();
      });
      startCall.mockRestore();
    }
  }, 20_000);

  it("leaving the screen does NOT end the call", async () => {
    // Hardware back unmounts the call screen. That used to hang up, because
    // the call lived in the screen; now the screen is only a view of it.
    const endCall = jest.spyOn(callsService, "endCall");

    let renderer!: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <SafeAreaProvider initialMetrics={TEST_METRICS}>
          <ThemeProvider override="light">
            <CallScreen />
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    });

    try {
      await settle();
      expect(useActiveCallStore.getState().active).not.toBeNull();

      await TestRenderer.act(async () => {
        renderer.unmount();
      });
      await settle();

      expect(endCall).not.toHaveBeenCalled();
      expect(useActiveCallStore.getState().active?.phase).not.toBe("ended");
    } finally {
      endCall.mockRestore();
    }
  }, 20_000);
});
