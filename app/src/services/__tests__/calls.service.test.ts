/**
 * A call must reach the SERVER, not just this phone.
 *
 * `calls.service.ts` was still the A17 mock in full long after every other
 * service had a real branch. `startCall` minted a CallSession in local memory,
 * `POST /calls` was never sent, so the server never emitted `call:incoming`
 * and the person being called never rang. The caller saw "Ringing…" for 45
 * seconds and it was logged as missed (PLAN #192).
 *
 * Nothing caught it, and nothing could have: all 506 tests run in MOCK mode,
 * where not calling the API is the correct behaviour. The gap was never a
 * wrong assertion — it was the absence of a test that ran in real mode at all.
 * That is what this file is.
 */

const REAL_API = process.env.EXPO_PUBLIC_API;
// Both are global state. Left replaced, they leak into whatever file Jest runs
// next in this worker — and a suite that fails only depending on file order is
// far more expensive than the four lines that prevent it.
const REAL_FETCH = global.fetch;

afterAll(() => {
  process.env.EXPO_PUBLIC_API = REAL_API;
  global.fetch = REAL_FETCH;
});

type Call = { method: string; url: string; body: unknown };

let calls: Call[] = [];

/**
 * The client in REAL mode, with `fetch` captured.
 *
 * `client.ts` reads `EXPO_PUBLIC_API` once at module load, so switching modes
 * means re-importing the graph — `require`, not `import()`, which would need
 * `--experimental-vm-modules` that this runner does not set.
 */
function loadInRealMode(response: unknown) {
  process.env.EXPO_PUBLIC_API = "http://127.0.0.1:4000";
  jest.resetModules();
  calls = [];

  global.fetch = jest.fn(async (url: unknown, init?: unknown) => {
    const options = (init ?? {}) as { method?: string; body?: string };
    calls.push({
      method: options.method ?? "GET",
      url: String(url),
      body: options.body ? JSON.parse(options.body) : undefined,
    });
    return {
      ok: true,
      status: 200,
      json: async () => response,
      text: async () => JSON.stringify(response),
    };
  }) as unknown as typeof fetch;

  /* eslint-disable @typescript-eslint/no-require-imports */
  const client = require("@/services/client") as typeof import("@/services/client");
  const service = require("@/services/calls.service") as typeof import("@/services/calls.service");
  /* eslint-enable @typescript-eslint/no-require-imports */

  client.setTokens({ token: "test-token", refreshToken: "test-refresh" });
  return service.callsService;
}

const SESSION = {
  id: "call_server_1",
  threadId: "thread_1",
  direction: "outgoing",
  startedAt: "2026-09-28T10:00:00.000Z",
  durationSec: 0,
  outcome: "cancelled",
};

describe("callsService against the real API", () => {
  it("startCall POSTs /calls — this is what makes the other phone ring", () => {
    const service = loadInRealMode(SESSION);

    return service.startCall("thread_1", "outgoing").then((session) => {
      expect(calls).toHaveLength(1);
      expect(calls[0]?.method).toBe("POST");
      expect(calls[0]?.url).toContain("/calls");
      // The server derives `direction` per viewer, so the client must not send
      // one — the same call is outgoing to the caller and incoming to the
      // callee, and a stored direction is wrong for one of them.
      expect(calls[0]?.body).toEqual({ threadId: "thread_1" });

      // And the SERVER's id comes back, not a locally minted one. The callee
      // accepts by this id; a local `call_1` would match nothing.
      expect(session.id).toBe("call_server_1");
    });
  });

  it("endCall POSTs to the call's own id, with the outcome and duration", () => {
    const service = loadInRealMode({ ...SESSION, outcome: "completed", durationSec: 134 });

    return service.endCall("call_server_1", "completed", 134).then(() => {
      expect(calls).toHaveLength(1);
      expect(calls[0]?.method).toBe("POST");
      expect(calls[0]?.url).toContain("/calls/call_server_1/end");
      expect(calls[0]?.body).toEqual({ outcome: "completed", durationSec: 134 });
    });
  });

  it("listCalls GETs /calls, and passes threadId as a query", () => {
    const service = loadInRealMode([SESSION]);

    return service.listCalls("thread_1").then(() => {
      expect(calls).toHaveLength(1);
      expect(calls[0]?.method).toBe("GET");
      expect(calls[0]?.url).toContain("/calls?threadId=thread_1");
    });
  });
});

describe("callsService in mock mode", () => {
  /**
   * The mock path is not a fallback, it is a first-class one: the offline demo
   * runs on it and so do the other 506 tests. A real branch that also fired in
   * mock mode would break every one of them against a server that is not there.
   */
  it("touches the network for nothing", async () => {
    process.env.EXPO_PUBLIC_API = "mock";
    jest.resetModules();
    calls = [];
    global.fetch = jest.fn(() => {
      throw new Error("mock mode must not reach the network");
    }) as unknown as typeof fetch;

    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const { callsService } = require("@/services/calls.service") as typeof import("@/services/calls.service");

    const started = await callsService.startCall("thread_1");
    expect(calls).toHaveLength(0);
    // A locally minted id, which is exactly right when there is no server.
    expect(started.id).toMatch(/^call/);

    await callsService.endCall(started.id, "cancelled", 0);
    expect(calls).toHaveLength(0);
  });
});
