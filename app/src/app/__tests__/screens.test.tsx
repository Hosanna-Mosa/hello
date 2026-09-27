/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Render-tree snapshots for every auth and onboarding screen (PLAN Phase 4).
 *
 * Both themes, same contract as Phases 1 and 2: once captured, later phases must
 * not change these. These are route files, so they are rendered directly rather
 * than through the router — navigation is mocked, because what is under test is
 * what the screen draws, not where it goes.
 */

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ dial: "+91", number: "98765 43210" }),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: Object.assign(() => null, {
    Screen: () => null,
    Protected: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  getLastKnownPositionAsync: jest.fn(async () => null),
}));

import NotFoundScreen from "@/app/+not-found";
import WelcomeScreen from "@/app/(auth)/index";
import OtpScreen from "@/app/(auth)/otp";
import PhoneScreen from "@/app/(auth)/phone";
import AgeRestrictedScreen from "@/app/(onboarding)/age-restricted";
import AvatarScreen from "@/app/(onboarding)/avatar";
import BioScreen from "@/app/(onboarding)/bio";
import BirthdayScreen from "@/app/(onboarding)/birthday";
import GenderScreen from "@/app/(onboarding)/gender";
import InterestsScreen from "@/app/(onboarding)/interests";
import LocationScreen from "@/app/(onboarding)/location";
import NameScreen from "@/app/(onboarding)/name";

import { renderAtom, THEMES } from "@/components/common/atoms/__tests__/renderAtom";

describe.each(THEMES)("auth + onboarding screens — %s theme", (theme) => {
  // --- (auth) ---
  it("(auth)/index — welcome", () =>
    expect(renderAtom(<WelcomeScreen />, theme)).toMatchSnapshot());

  it("(auth)/phone", () => expect(renderAtom(<PhoneScreen />, theme)).toMatchSnapshot());

  it("(auth)/otp", () => expect(renderAtom(<OtpScreen />, theme)).toMatchSnapshot());

  // --- (onboarding), in wizard order ---
  it("(onboarding)/name — step 1", () =>
    expect(renderAtom(<NameScreen />, theme)).toMatchSnapshot());

  it("(onboarding)/birthday — step 2", () =>
    expect(renderAtom(<BirthdayScreen />, theme)).toMatchSnapshot());

  it("(onboarding)/gender — step 3", () =>
    expect(renderAtom(<GenderScreen />, theme)).toMatchSnapshot());

  it("(onboarding)/avatar — step 4", () =>
    expect(renderAtom(<AvatarScreen />, theme)).toMatchSnapshot());

  it("(onboarding)/interests — step 5", () =>
    expect(renderAtom(<InterestsScreen />, theme)).toMatchSnapshot());

  it("(onboarding)/bio — step 6", () =>
    expect(renderAtom(<BioScreen />, theme)).toMatchSnapshot());

  it("(onboarding)/location — step 7", () =>
    expect(renderAtom(<LocationScreen />, theme)).toMatchSnapshot());

  it("(onboarding)/age-restricted — the dead end", () =>
    expect(renderAtom(<AgeRestrictedScreen />, theme)).toMatchSnapshot());

  // --- system ---
  it("+not-found", () => expect(renderAtom(<NotFoundScreen />, theme)).toMatchSnapshot());
});
