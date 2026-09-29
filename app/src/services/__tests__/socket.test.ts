/**
 * The subscribe-before-connect contract.
 *
 * `chat.store.ts` subscribes at MODULE LOAD, which happens when the first
 * screen importing the store renders — long before sign-in opens the socket.
 * If a subscription made at that moment is dropped, the socket connects with
 * nothing listening and every live feature dies silently: the app still works,
 * because leaving and reopening a screen refetches over HTTP, so the only
 * symptom is that nothing ever updates by itself.
 *
 * That shipped, and cost a two-phone debugging session (PLAN #120).
 */

const mockBound: [string, (payload: unknown) => void][] = [];
const mockIo: { options: { auth?: unknown } | null; connect: jest.Mock } = {
  options: null,
  connect: jest.fn(),
};

jest.mock("socket.io-client", () => ({
  io: (_url: string, options: { auth?: unknown }) => {
    mockIo.options = options;
    return {
      connected: false,
      on: (event: string, handler: (payload: unknown) => void) => {
        mockBound.push([event, handler]);
      },
      off: () => {},
      emit: () => {},
      connect: mockIo.connect,
      disconnect: () => {},
    };
  },
}));

const REAL_API = process.env.EXPO_PUBLIC_API;

afterAll(() => {
  process.env.EXPO_PUBLIC_API = REAL_API;
});

/**
 * A fresh module graph with the client in REAL mode rather than mock.
 *
 * `client.ts` reads `EXPO_PUBLIC_API` once at module load, so switching modes
 * means re-importing it — and `require` rather than `import()`, which needs
 * `--experimental-vm-modules` that this runner does not set.
 */
function loadSocketModule() {
  process.env.EXPO_PUBLIC_API = "http://127.0.0.1:4000";
  jest.resetModules();
  mockBound.length = 0;

  /* eslint-disable @typescript-eslint/no-require-imports */
  return {
    socket: require("@/services/socket") as typeof import("@/services/socket"),
    client: require("@/services/client") as typeof import("@/services/client"),
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
}

describe("onSocket", () => {
  it("binds a handler that subscribed before the socket existed", () => {
    const { socket, client } = loadSocketModule();

    const received: unknown[] = [];
    // Exactly what the stores do: subscribe at import time, nobody signed in.
    socket.onSocket("message:new", (payload) => received.push(payload));

    // Nothing to bind to yet — and that must not lose the subscription.
    expect(mockBound).toHaveLength(0);

    client.setTokens({ token: "access", refreshToken: "refresh" });
    socket.connectSocket();

    const bound = mockBound.find(([event]) => event === "message:new");
    expect(bound).toBeDefined();

    // And it is the caller's own handler, not merely something named alike.
    bound?.[1]({ threadId: "thread-1" });
    expect(received).toEqual([{ threadId: "thread-1" }]);
  });

  it("binds every subscriber, not just the first", () => {
    const { socket, client } = loadSocketModule();

    socket.onSocket("message:new", () => {});
    socket.onSocket("thread:receipt", () => {});
    socket.onSocket("thread:ended", () => {});

    client.setTokens({ token: "access", refreshToken: "refresh" });
    socket.connectSocket();

    // The socket's own lifecycle listeners (connect / connect_error) aside.
    const lifecycle = new Set(["connect", "connect_error"]);
    expect(mockBound.map(([event]) => event).filter((e) => !lifecycle.has(e)).sort()).toEqual([
      "message:new",
      "thread:ended",
      "thread:receipt",
    ]);
  });

  it("stops delivering after the returned unsubscribe is called", () => {
    const { socket, client } = loadSocketModule();

    const received: unknown[] = [];
    const stop = socket.onSocket("message:new", (payload) => received.push(payload));
    stop();

    client.setTokens({ token: "access", refreshToken: "refresh" });
    socket.connectSocket();

    expect(mockBound.find(([event]) => event === "message:new")).toBeUndefined();
    expect(received).toEqual([]);
  });

  it("subscribes fine after the socket is already connected", () => {
    const { socket, client } = loadSocketModule();

    client.setTokens({ token: "access", refreshToken: "refresh" });
    socket.connectSocket();

    const received: unknown[] = [];
    socket.onSocket("message:new", (payload) => received.push(payload));

    const bound = mockBound.find(([event]) => event === "message:new");
    bound?.[1]({ threadId: "thread-2" });
    expect(received).toEqual([{ threadId: "thread-2" }]);
  });
});

describe("the handshake token", () => {
  it("is read at EACH connect, so a reconnect after a refresh carries the new one", async () => {
    const { socket, client } = loadSocketModule();
    client.setTokens({ token: "first", refreshToken: "r" });
    socket.connectSocket();

    const auth = mockIo.options?.auth as (cb: (data: { token: string }) => void) => void;
    // The object form (`{ token }`) froze the sign-in token for the socket's life.
    expect(typeof auth).toBe("function");

    client.setTokens({ token: "second", refreshToken: "r" });
    const sent = await new Promise<{ token: string }>((resolve) => auth(resolve));
    expect(sent.token).toBe("second");
    socket.disconnectSocket();
  });

  it("retries a handshake the server refused — socket.io will not", () => {
    jest.useFakeTimers();
    try {
      const { socket, client } = loadSocketModule();
      mockIo.connect.mockClear();
      client.setTokens({ token: "t", refreshToken: "r" });
      socket.connectSocket();

      const onError = mockBound.find(([event]) => event === "connect_error")?.[1];
      onError?.(Object.assign(new Error("Sign in to connect."), { data: { error: { code: "unauthorized" } } }));
      jest.advanceTimersByTime(2500);

      expect(mockIo.connect).toHaveBeenCalledTimes(1);
      socket.disconnectSocket();
    } finally {
      jest.useRealTimers();
    }
  });
});
