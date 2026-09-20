/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Render-tree snapshots for profile, settings and safety (PLAN Phase 8).
 *
 * States are reached through the real services, as in Phases 6 and 7: the
 * blocked list is a real block, the "no bio" profile is a real empty field, and
 * the report confirmation is a real submitted report.
 */

const mockParams: { id: string } = { id: "user-01" };

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");

  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: Object.assign(() => null, {
      Screen: () => null,
      Protected: ({ children }: { children: React.ReactNode }) => children,
    }),
  };
});

import ProfileTab from "@/app/(tabs)/profile";
import EditAvatarScreen from "@/app/edit-profile/avatar";
import EditBioScreen from "@/app/edit-profile/bio";
import EditProfileScreen from "@/app/edit-profile/index";
import EditInterestsScreen from "@/app/edit-profile/interests";
import ReportScreen from "@/app/report/[id]";
import AccountSettingsScreen from "@/app/settings/account";
import BlockedSettingsScreen from "@/app/settings/blocked";
import DeleteAccountScreen from "@/app/settings/delete-account";
import DiscoverySettingsScreen from "@/app/settings/discovery";
import HelpSettingsScreen from "@/app/settings/help";
import SettingsScreen from "@/app/settings/index";
import LegalSettingsScreen from "@/app/settings/legal";
import NotificationSettingsScreen from "@/app/settings/notifications";
import SafetySettingsScreen from "@/app/settings/safety";

import { NotificationPrimer } from "@/components/notifications/NotificationPrimer";
import { CompletenessRing } from "@/components/profile/CompletenessRing";
import { ProfileMenu } from "@/components/profile/ProfileMenu";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { SafetyCard } from "@/components/safety/SafetyCard";

import { Avatar } from "@/components/common";
import { renderAtom, renderAtomAsync, THEMES } from "@/components/common/atoms/__tests__/renderAtom";
import { authService } from "@/services/auth.service";
import { billingService } from "@/services/billing.service";
import { configureClient, resetClient } from "@/services/client";
import { meService } from "@/services/me.service";
import { safetyService } from "@/services/safety.service";
import { settingsService } from "@/services/settings.service";
import { useEntitlementsStore } from "@/stores/entitlements.store";
import { useSettingsStore } from "@/stores/settings.store";

const noop = () => {};

/**
 * Put the profile in the state the onboarding wizard leaves it in.
 *
 * `CURRENT_USER` is deliberately blank — every field is filled by the wizard —
 * so without this the "filled" and "empty" profile snapshots are byte-identical
 * and neither proves anything.
 */
async function onboarded() {
  await meService.updateMe({
    name: "Ash",
    birthday: "1999-04-12",
    avatarId: "avatar-01",
    bio: "Always up for a walk and a long coffee.",
    interestIds: ["hiking", "coffee", "board-games"],
  });
}

beforeEach(() => {
  // Entitlements are global and every surface now reads them: without this a
  // suite that flips premium leaves the next one rendering no ad slots.
  billingService.__reset();
  useEntitlementsStore.setState({ entitlements: null, plans: [], loading: false });
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  meService.__reset();
  safetyService.__reset();
  settingsService.__reset();
  authService.__reset();
  useSettingsStore.setState({ preferences: null, blocked: [], loading: false, error: null });
  mockParams.id = "user-01";
});
afterAll(resetClient);

describe.each(THEMES)("Phase 8 — profile — %s theme", (theme) => {
  it("(tabs)/profile", async () => {
    await onboarded();
    expect(await renderAtomAsync(<ProfileTab />, theme)).toMatchSnapshot();
  });

  it("(tabs)/profile — nothing filled in", async () =>
    // `CURRENT_USER` ships blank on purpose — it is the pre-onboarding state,
    // and the wizard is what fills it. So this one needs no setup at all.
    expect(await renderAtomAsync(<ProfileTab />, theme)).toMatchSnapshot());

  it("edit-profile", async () => {
    await onboarded();
    expect(await renderAtomAsync(<EditProfileScreen />, theme)).toMatchSnapshot();
  });

  it("edit-profile/avatar", async () => {
    await onboarded();
    expect(await renderAtomAsync(<EditAvatarScreen />, theme)).toMatchSnapshot();
  });

  it("edit-profile/bio", async () => {
    await onboarded();
    expect(await renderAtomAsync(<EditBioScreen />, theme)).toMatchSnapshot();
  });

  it("edit-profile/interests", async () => {
    await onboarded();
    expect(await renderAtomAsync(<EditInterestsScreen />, theme)).toMatchSnapshot();
  });
});

describe.each(THEMES)("Phase 8 — settings — %s theme", (theme) => {
  it("settings", async () =>
    expect(await renderAtomAsync(<SettingsScreen />, theme)).toMatchSnapshot());

  it("settings/account", async () => {
    // A real session, so the phone row has the number it was opened with.
    await authService.sendCode("+91", "9876543210");
    await authService.verifyCode("123456");
    expect(await renderAtomAsync(<AccountSettingsScreen />, theme)).toMatchSnapshot();
  });

  it("settings/discovery", async () =>
    expect(await renderAtomAsync(<DiscoverySettingsScreen />, theme)).toMatchSnapshot());

  it("settings/discovery — hidden", async () => {
    await settingsService.updatePreferences({ discoverable: false });
    expect(await renderAtomAsync(<DiscoverySettingsScreen />, theme)).toMatchSnapshot();
  });

  it("settings/notifications", async () =>
    expect(await renderAtomAsync(<NotificationSettingsScreen />, theme)).toMatchSnapshot());

  it("settings/blocked — empty", async () =>
    expect(await renderAtomAsync(<BlockedSettingsScreen />, theme)).toMatchSnapshot());

  it("settings/blocked — with someone blocked", async () => {
    await safetyService.block("user-02");
    expect(await renderAtomAsync(<BlockedSettingsScreen />, theme)).toMatchSnapshot();
  });

  it("settings/safety", () =>
    expect(renderAtom(<SafetySettingsScreen />, theme)).toMatchSnapshot());

  it("settings/help", () =>
    expect(renderAtom(<HelpSettingsScreen />, theme)).toMatchSnapshot());

  it("settings/legal", () =>
    expect(renderAtom(<LegalSettingsScreen />, theme)).toMatchSnapshot());

  it("settings/delete-account — reason", () =>
    expect(renderAtom(<DeleteAccountScreen />, theme)).toMatchSnapshot());
});

describe.each(THEMES)("Phase 8 — safety — %s theme", (theme) => {
  it("report/[id] — reason picker", async () =>
    expect(await renderAtomAsync(<ReportScreen />, theme)).toMatchSnapshot());

  it("NotificationPrimer", () =>
    expect(
      renderAtom(
        <NotificationPrimer visible onAccept={noop} onDecline={noop} />,
        theme,
      ),
    ).toMatchSnapshot());

  it("SafetyCard", () =>
    expect(
      renderAtom(
        <SafetyCard
          title="Be kind"
          body="Kind and genuine conversations only."
          icon={{ ios: "hand.wave", android: "waving_hand" }}
        />,
        theme,
      ),
    ).toMatchSnapshot());
});

describe.each(THEMES)("Phase 8 — components — %s theme", (theme) => {
  it.each([0, 45, 100])("CompletenessRing — %i%%", (percent) =>
    expect(
      renderAtom(
        <CompletenessRing percent={percent}>
          <Avatar name="Ash" size="xl" />
        </CompletenessRing>,
        theme,
      ),
    ).toMatchSnapshot());

  it("ProfileStats", () =>
    expect(renderAtom(<ProfileStats matches={8} likes={6} />, theme)).toMatchSnapshot());

  it("ProfileMenu", () =>
    expect(
      renderAtom(
        <ProfileMenu
          onEditPress={noop}
          onPreferencesPress={noop}
          onSafetyPress={noop}
          onHelpPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());
});

describe("Phase 8 — behaviour", () => {
  it("the 18+ gate holds at the data layer, not just the screen", async () => {
    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 16);

    await expect(
      meService.updateMe({ birthday: tooYoung.toISOString().slice(0, 10) }),
    ).rejects.toThrow();
  });

  it("preferences default to discoverable with every channel on", async () => {
    const preferences = await settingsService.getPreferences();
    expect(preferences.discoverable).toBe(true);
    expect(Object.values(preferences.notifications).every(Boolean)).toBe(true);
    // The primer has not fired yet — that is what makes it fire once (A4).
    expect(preferences.notificationPrimerShown).toBe(false);
  });

  it("a notification channel toggles without disturbing the others", async () => {
    const after = await settingsService.setNotificationChannel("likes", false);
    expect(after.notifications.likes).toBe(false);
    expect(after.notifications.messages).toBe(true);
    expect(after.notifications.newMatches).toBe(true);
  });

  it("the primer is marked shown so it cannot ask twice (A4)", async () => {
    await useSettingsStore.getState().markPrimerShown();
    expect(useSettingsStore.getState().preferences?.notificationPrimerShown).toBe(true);
    expect((await settingsService.getPreferences()).notificationPrimerShown).toBe(true);
  });

  it("blocking then unblocking leaves nothing behind", async () => {
    await safetyService.block("user-03");
    expect(await safetyService.listBlocked()).toHaveLength(1);

    await safetyService.unblock("user-03");
    expect(await safetyService.listBlocked()).toHaveLength(0);
  });

  it("a report with also-block files both", async () => {
    await safetyService.report("user-04", "romanticAdvance", "Kept asking me out.", true);

    const reports = await safetyService.listReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].reason).toBe("romanticAdvance");
    expect(reports[0].alsoBlocked).toBe(true);
    expect(await safetyService.listBlocked()).toHaveLength(1);
  });

  it("the session remembers the number it was opened with", async () => {
    await authService.sendCode("+91", "9876543210");
    await authService.verifyCode("123456");
    expect((await authService.getSession())?.phone).toBe("+91 9876543210");
  });
});
