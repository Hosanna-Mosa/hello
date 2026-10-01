/**
 * Where a sign-in lands.
 *
 * Sign-in (then `verifyCode`) used to set "onboarding" unconditionally. That was true of the
 * mock — every verify there mints a brand new account — and wrong of the real
 * API, where signing in on a second device, after a reinstall, or after the
 * in-memory token simply expired walked the same person through all seven
 * wizard steps again, overwriting answers they had already given (PLAN #141).
 */

import { authService } from "@/services/auth.service";
import { configureClient, resetClient } from "@/services/client";
import { meService } from "@/services/me.service";
import { useSessionStore } from "@/stores/session.store";
import type { Session } from "@/services/types";

function aSession(onboardingComplete: boolean): Session {
  return {
    userId: "u-1",
    token: "access",
    refreshToken: "refresh",
    expiresIn: 900,
    phone: "+44 7700900123",
    onboardingComplete,
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  authService.__reset();
  meService.__reset();
  useSessionStore.setState({ status: "loading", user: null });
});

afterEach(() => jest.restoreAllMocks());
afterAll(resetClient);

describe("signing in", () => {
  it("sends a NEW account to onboarding", async () => {
    jest.spyOn(authService, "login").mockResolvedValue(aSession(false));

    await useSessionStore.getState().login("asha@example.com", "friendly-42");

    expect(useSessionStore.getState().status).toBe("onboarding");
  });

  it("sends an EXISTING account straight in, skipping the wizard", async () => {
    jest.spyOn(authService, "login").mockResolvedValue(aSession(true));

    await useSessionStore.getState().login("asha@example.com", "friendly-42");

    expect(useSessionStore.getState().status).toBe("signedIn");
  });

  it("loads the person either way", async () => {
    jest.spyOn(authService, "login").mockResolvedValue(aSession(true));

    await useSessionStore.getState().login("asha@example.com", "friendly-42");

    expect(useSessionStore.getState().user).not.toBeNull();
  });
});

describe("signing up", () => {
  it("always starts the wizard", async () => {
    jest.spyOn(authService, "signup").mockResolvedValue(aSession(false));

    await useSessionStore.getState().signup({
      name: "Asha",
      email: "asha@example.com",
      countryCode: "+91",
      phoneNumber: "9876543210",
      password: "friendly-42",
    });

    expect(useSessionStore.getState().status).toBe("onboarding");
  });
});
