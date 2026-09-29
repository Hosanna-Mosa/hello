/**
 * Signing in must survive closing the app.
 *
 * Tokens lived in a module variable in `client.ts` and the session in another
 * in `auth.service.ts`, so both died with the process. Every app close signed
 * the user out and sent them to read a fresh OTP off the server log — while the
 * server was perfectly happy to keep them signed in, since the refresh token is
 * good for thirty days (PLAN R7, #208).
 *
 * None of the 512 existing tests could catch that: they all run in MOCK mode,
 * where not persisting is correct. So, like the calls service before it, the
 * gap was the absence of a real-mode test rather than a wrong assertion.
 */

// `mock`-prefixed on purpose: jest hoists `jest.mock` above the imports, and
// its factory may only reach variables named this way.
const mockStore = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

const REAL_API = process.env.EXPO_PUBLIC_API;
const REAL_FETCH = global.fetch;

afterAll(() => {
  process.env.EXPO_PUBLIC_API = REAL_API;
  global.fetch = REAL_FETCH;
});

const SESSION = {
  userId: "507f1f77bcf86cd799439011",
  token: "access-token-1",
  refreshToken: "refresh-token-1",
  onboardingComplete: true,
};

/** A fresh module graph in REAL mode — i.e. a cold start of the app. */
function coldStart(responses: unknown[]) {
  process.env.EXPO_PUBLIC_API = "http://127.0.0.1:4000";
  jest.resetModules();

  const queue = [...responses];
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => queue.shift() ?? {},
    text: async () => JSON.stringify(queue.shift() ?? {}),
  })) as unknown as typeof fetch;

  /* eslint-disable @typescript-eslint/no-require-imports */
  return {
    auth: (require("@/services/auth.service") as typeof import("@/services/auth.service"))
      .authService,
    client: require("@/services/client") as typeof import("@/services/client"),
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
}

beforeEach(() => {
  mockStore.clear();
});

describe("session persistence", () => {
  it("writes the session to the keychain when the code is verified", async () => {
    const { auth } = coldStart([{ resendAfterSec: 30 }, SESSION]);

    await auth.sendCode("44", "7700900123");
    await auth.verifyCode("123456");

    // Not "setItemAsync was called" — what was STORED is what matters, and it
    // must carry the refresh token, which is the whole point of the keychain.
    const stored = JSON.parse([...mockStore.values()][0] ?? "{}");
    expect(stored.refreshToken).toBe("refresh-token-1");
    expect(stored.userId).toBe(SESSION.userId);
  });

  it("restores that session on a COLD START — a new process, nothing in memory", async () => {
    const first = coldStart([{ resendAfterSec: 30 }, SESSION]);
    await first.auth.sendCode("44", "7700900123");
    await first.auth.verifyCode("123456");

    // The app closes. Everything in memory is gone; only the keychain survives,
    // which is exactly what `mockStore` is here.
    const second = coldStart([]);
    expect(second.client.getAccessToken()).toBeNull();

    const restored = await second.auth.getSession();

    expect(restored?.userId).toBe(SESSION.userId);
    // And the token is armed, so the very next request is authenticated. Before
    // this change `getSession()` returned null here and the user was signed out.
    expect(second.client.getAccessToken()).toBe("access-token-1");
    expect(second.client.currentUserIdOrMe()).toBe(SESSION.userId);
  });

  it("keeps the stored copy current when the refresh token ROTATES", async () => {
    const { auth, client } = coldStart([{ resendAfterSec: 30 }, SESSION]);
    await auth.sendCode("44", "7700900123");
    await auth.verifyCode("123456");

    // What a refresh does: new pair, old one now invalid. The server destroys
    // the whole session family if an old refresh token is replayed, so a stored
    // copy that missed this is worse than no stored copy at all.
    client.setTokens({ token: "access-token-2", refreshToken: "refresh-token-2" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = JSON.parse([...mockStore.values()][0] ?? "{}");
    expect(stored.refreshToken).toBe("refresh-token-2");
    // The rest of the session survived the token-only update.
    expect(stored.userId).toBe(SESSION.userId);
  });

  it("persists the pair a REAL refresh returns, not only a direct setTokens", async () => {
    const { auth, client } = coldStart([{ resendAfterSec: 30 }, SESSION]);
    await auth.sendCode("44", "7700900123");
    await auth.verifyCode("123456");

    // An expired access token: 401, then the refresh, then the replay.
    const replies = [
      { status: 401, body: { error: { code: "unauthorized" } } },
      { status: 200, body: { token: "access-token-3", refreshToken: "refresh-token-3", expiresIn: 900 } },
      { status: 200, body: { ok: true } },
    ];
    global.fetch = jest.fn(async () => {
      const next = replies.shift() ?? { status: 200, body: {} };
      return {
        ok: next.status < 400,
        status: next.status,
        json: async () => next.body,
        text: async () => JSON.stringify(next.body),
      };
    }) as unknown as typeof fetch;

    await client.http("GET", "/me");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = JSON.parse([...mockStore.values()][0] ?? "{}");
    expect(stored.refreshToken).toBe("refresh-token-3");
  });

  it("clears the keychain on sign out", async () => {
    const { auth } = coldStart([{ resendAfterSec: 30 }, SESSION, {}]);
    await auth.sendCode("44", "7700900123");
    await auth.verifyCode("123456");
    expect(mockStore.size).toBe(1);

    await auth.signOut();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // A signed-out phone that still holds a thirty-day refresh token in its
    // keychain is a credential nobody meant to leave behind.
    expect(mockStore.size).toBe(0);
  });

  it("mock mode persists nothing", async () => {
    process.env.EXPO_PUBLIC_API = "mock";
    jest.resetModules();
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const { authService } = require("@/services/auth.service") as typeof import("@/services/auth.service");

    await authService.sendCode("44", "7700900123");
    await authService.verifyCode("123456");

    // The offline demo and all 512 other tests depend on a fresh process
    // starting signed out.
    expect(mockStore.size).toBe(0);
  });
});
