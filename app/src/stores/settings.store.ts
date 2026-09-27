/**
 * Preferences, blocked people and the account actions.
 *
 * Thin over `settings.service` and `safety.service`: the settings tree is nine
 * screens reading one shared object, and having each screen fetch its own copy
 * is how two of them end up disagreeing about whether you are discoverable.
 */

import { create } from "zustand";

import { safetyService } from "@/services/safety.service";
import { settingsService } from "@/services/settings.service";
import type { Block, NotificationChannel, Preferences, PublicProfile } from "@/services/types";

export type BlockedPerson = { block: Block; profile: PublicProfile | null };

export type SettingsState = {
  preferences: Preferences | null;
  blocked: BlockedPerson[];
  loading: boolean;
  error: unknown;

  load: () => Promise<void>;
  loadBlocked: (resolve: (userId: string) => Promise<PublicProfile>) => Promise<void>;
  setDiscoverable: (discoverable: boolean) => Promise<void>;
  setNotificationChannel: (channel: NotificationChannel, enabled: boolean) => Promise<void>;
  markPrimerShown: () => Promise<void>;
  unblock: (userId: string) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  preferences: null,
  blocked: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ preferences: await settingsService.getPreferences() });
    } catch (error) {
      set({ error });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * `resolve` is injected rather than importing `profiles.service` here.
   *
   * A block hides that person from `profiles.service`, so the blocked list is
   * the one screen that has to look them up anyway — passing the lookup in
   * keeps this store from depending on the service that the block filters.
   */
  loadBlocked: async (resolve) => {
    const blocks = await safetyService.listBlocked();

    const people = await Promise.all(
      blocks.map(async (block) => {
        // The server embeds the summary, precisely because a blocked user is
        // excluded from `GET /profiles/:id` — resolving them individually
        // would be a round trip guaranteed to 404. The mock has no such
        // exclusion and resolves locally, which is what `resolve` is for.
        if (block.user) return { block, profile: block.user };

        try {
          return { block, profile: await resolve(block.blockedUserId) };
        } catch {
          // A blocked person who no longer resolves still has to be unblockable.
          return { block, profile: null };
        }
      }),
    );

    set({ blocked: people });
  },

  setDiscoverable: async (discoverable) => {
    set({ preferences: await settingsService.updatePreferences({ discoverable }) });
  },

  setNotificationChannel: async (channel, enabled) => {
    set({ preferences: await settingsService.setNotificationChannel(channel, enabled) });
  },

  markPrimerShown: async () => {
    set({
      preferences: await settingsService.updatePreferences({ notificationPrimerShown: true }),
    });
  },

  unblock: async (userId) => {
    await safetyService.unblock(userId);
    set({ blocked: get().blocked.filter((entry) => entry.block.blockedUserId !== userId) });
  },
}));
