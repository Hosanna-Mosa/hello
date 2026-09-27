/**
 * The single source every gated surface reads.
 *
 * No screen decides for itself whether to show an ad, a lock or a blur — they
 * all ask here. That is what makes "every ad slot disappears when premium flips
 * on" true by construction rather than by twenty separate correct decisions,
 * and it is the only way the Phase 9 verification ("confirm zero ad slots
 * render when premium is on") can be checked rather than hoped for.
 *
 * `showAds` is deliberately not just `!isPremium`. Until the entitlements have
 * loaded we know nothing, and flashing an ad for one frame and then pulling it
 * is worse than showing nothing — so an unknown tier shows no ads and no locks.
 */

import { useEffect } from "react";

import { useEntitlementsStore } from "@/stores/entitlements.store";
import type { Entitlements } from "@/services/types";

export type EntitlementsView = {
  entitlements: Entitlements | null;
  /** True only once we know the tier. */
  loaded: boolean;
  isPremium: boolean;
  /** Free tier, tier known. Every ad slot reads exactly this. */
  showAds: boolean;
  /** Likes left today. `Infinity` on premium (A16). */
  likesRemaining: number;
  /** When the free quota rolls over. Null on premium or before load. */
  likesResetAt: Date | null;
};

export function useEntitlements(): EntitlementsView {
  const entitlements = useEntitlementsStore((state) => state.entitlements);
  const refresh = useEntitlementsStore((state) => state.refresh);

  useEffect(() => {
    // Cheap and idempotent: the store holds one object and the mock service
    // answers from memory, so every gated surface can ask on mount.
    if (!entitlements) void refresh();
  }, [entitlements, refresh]);

  const loaded = entitlements !== null;
  const isPremium = entitlements?.isPremium ?? false;

  return {
    entitlements,
    loaded,
    isPremium,
    showAds: loaded && !isPremium,
    likesRemaining: entitlements?.likesRemaining ?? 0,
    likesResetAt: entitlements ? new Date(entitlements.likesResetAt) : null,
  };
}
