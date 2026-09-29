/**
 * The call in progress, in REAL mode — where both reported bugs lived.
 *
 * 1. "Hosanna's phone kept ringing after Sunand picked up." The callee told the
 *    caller "accepted" before its own connection existed, so the caller's
 *    offer arrived at nothing. Pinned here as an ORDER: accept is emitted only
 *    after the callee's media has started.
 * 2. "Back ended the call." The call lived in the screen and hung up on
 *    unmount. The screen is gone from this test entirely — the call is driven
 *    through the store alone, which is the point.
 *
 * Every other suite runs in mock mode, where there is no accept and no media,
 * so neither bug was reachable from them.
 */

const mockEvents: string[] = [];
const mockSocketHandlers = new Map<string, (payload: unknown) => void>();
let mockResolveMedia: ((ok: boolean) => void) | null = null;

jest.mock("@/services/client", () => ({
  ...jest.requireActual("@/services/client"),
  isMockMode: () => false,
  currentUserIdOrMe: () => "me",
}));

jest.mock("@/services/socket", () => ({
  onSocket: (event: string, handler: (payload: unknown) => void) => {
    mockSocketHandlers.set(event, handler);
    return () => {};
  },
  emitCallAccept: (callId: string) => mockEvents.push(`accept:${callId}`),
}));

jest.mock("@/services/webrtc", () => ({
  startCallMedia: jest.fn(
    (options: { role: string }) =>
      new Promise<boolean>((resolve) => {
        mockEvents.push(`media:${options.role}`);
        mockResolveMedia = (ok) => {
          mockEvents.push(`media-ready:${options.role}`);
          resolve(ok);
        };
      }),
  ),
  stopCallMedia: jest.fn(async () => {
    mockEvents.push("media-stopped");
  }),
  handleCallSignal: jest.fn(async () => {}),
  setMuted: jest.fn(),
}));

jest.mock("@/services/calls.service", () => ({
  callsService: {
    startCall: jest.fn(async (threadId: string) => ({ id: "call-1", threadId })),
    endCall: jest.fn(async (callId: string, outcome: string) => {
      mockEvents.push(`end:${callId}:${outcome}`);
      return { id: callId };
    }),
  },
}));

jest.mock("@/services/chat.service", () => ({
  chatService: { getThread: jest.fn(async () => ({ participantIds: ["me", "them"] })) },
}));

jest.mock("@/services/profiles.service", () => ({
  profilesService: { getProfile: jest.fn(async () => ({ name: "Hosanna", avatarId: "a1" })) },
}));

// Required, not imported: an import is hoisted above the `mock*` state it
// needs, and the store registers its socket handlers the moment it loads.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __resetActiveCall, useActiveCallStore } = require("@/stores/activeCall.store") as typeof import("@/stores/activeCall.store");

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

beforeEach(() => {
  __resetActiveCall();
  mockEvents.length = 0;
  mockResolveMedia = null;
});

describe("answering", () => {
  it("accepts only AFTER the callee's media is ready", async () => {
    useActiveCallStore.getState().answer("thread-1", "call-1");
    await flush();

    // Media is starting (the mic prompt may be up). The caller must NOT have
    // been told yet — that is what made it send an offer into nothing.
    expect(mockEvents).toEqual(["media:callee"]);

    mockResolveMedia?.(true);
    await flush();

    expect(mockEvents).toEqual(["media:callee", "media-ready:callee", "accept:call-1"]);
    expect(useActiveCallStore.getState().active?.phase).toBe("connecting");
  });

  it("never accepts when the microphone could not open", async () => {
    useActiveCallStore.getState().answer("thread-1", "call-1");
    await flush();
    mockResolveMedia?.(false);
    await flush();

    expect(mockEvents).not.toContain("accept:call-1");
    expect(useActiveCallStore.getState().active?.phase).toBe("ended");
  });
});

describe("calling", () => {
  it("opens media on accept, and connects when the other side does", async () => {
    useActiveCallStore.getState().startOutgoing("thread-1");
    await flush();
    expect(useActiveCallStore.getState().active).toMatchObject({ callId: "call-1", phase: "ringing" });

    mockSocketHandlers.get("call:accepted")?.({ callId: "call-1" });
    await flush();
    expect(useActiveCallStore.getState().active?.phase).toBe("connecting");
    expect(mockEvents).toContain("media:caller");
  });

  it("ignores an accept for some other call", async () => {
    useActiveCallStore.getState().startOutgoing("thread-1");
    await flush();

    mockSocketHandlers.get("call:accepted")?.({ callId: "call-other" });
    await flush();
    expect(useActiveCallStore.getState().active?.phase).toBe("ringing");
  });

  it("starts only one call while one is running", async () => {
    const { callsService } = jest.requireMock("@/services/calls.service") as {
      callsService: { startCall: jest.Mock };
    };
    callsService.startCall.mockClear();

    useActiveCallStore.getState().startOutgoing("thread-1");
    useActiveCallStore.getState().startOutgoing("thread-1");
    useActiveCallStore.getState().startOutgoing("thread-2");
    await flush();

    expect(callsService.startCall).toHaveBeenCalledTimes(1);
  });
});

describe("ending", () => {
  it("the call keeps running until it is hung up", async () => {
    useActiveCallStore.getState().startOutgoing("thread-1");
    await flush();

    // Nothing here but the store: no screen mounted, none unmounted. The call
    // is still there — leaving the call screen is not hanging up.
    expect(useActiveCallStore.getState().active?.phase).toBe("ringing");
    expect(mockEvents.some((e) => e.startsWith("end:"))).toBe(false);

    useActiveCallStore.getState().hangUp();
    await flush();

    expect(mockEvents).toContain("media-stopped");
    expect(mockEvents).toContain("end:call-1:cancelled");
  });

  it("an end from the other side is not echoed back to the server", async () => {
    useActiveCallStore.getState().startOutgoing("thread-1");
    await flush();

    mockSocketHandlers.get("call:ended")?.({ call: { id: "call-1" } });
    await flush();

    expect(useActiveCallStore.getState().active?.phase).toBe("ended");
    expect(mockEvents.some((e) => e.startsWith("end:"))).toBe(false);
  });
});
