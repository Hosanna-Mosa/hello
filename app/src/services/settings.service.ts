/**
 * User preferences — discovery visibility and notification channels.
 *
 * A leaf service, like `safety.service`: it imports nothing else, so
 * `profiles.service` can honour `discoverable` without a dependency cycle.
 *
 * Separate from `me.service` because these are not profile fields. Nobody else
 * ever sees them, they are not part of `PublicProfile`, and a real backend would
 * put them behind their own endpoint with different caching.
 */

import { request } from "./client";
import type { NotificationChannel, Preferences } from "./types";

const DEFAULTS: Preferences = {
  discoverable: true,
  notifications: {
    newMatches: true,
    messages: true,
    messageRequests: true,
    likes: true,
    calls: true,
  },
  notificationPrimerShown: false,
};

/** Rebuilt on every write, never mutated — stores read straight from this. */
let preferences: Preferences = {
  ...DEFAULTS,
  notifications: { ...DEFAULTS.notifications },
};

export type PreferencesUpdate = Partial<Omit<Preferences, "notifications">>;

export const settingsService = {
  async getPreferences(): Promise<Preferences> {
    return request(() => ({
      ...preferences,
      notifications: { ...preferences.notifications },
    }));
  },

  async updatePreferences(patch: PreferencesUpdate): Promise<Preferences> {
    return request(() => {
      preferences = { ...preferences, ...patch };
      return { ...preferences, notifications: { ...preferences.notifications } };
    });
  },

  async setNotificationChannel(
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<Preferences> {
    return request(() => {
      preferences = {
        ...preferences,
        notifications: { ...preferences.notifications, [channel]: enabled },
      };
      return { ...preferences, notifications: { ...preferences.notifications } };
    });
  },

  __reset(): void {
    preferences = { ...DEFAULTS, notifications: { ...DEFAULTS.notifications } };
  },
};

export { DEFAULTS as DEFAULT_PREFERENCES };
