/**
 * The 30 preset avatars (A7).
 *
 * This is the entire "profile picture" system. There is no upload, camera,
 * crop or gallery anywhere in the product, so a user is one of these and
 * nothing else.
 *
 * `asset` is deliberately undefined: the artwork does not exist yet (R2), so
 * `Avatar` falls back to the initial on a tinted circle. When real art lands it
 * is `asset: require("...")` per row and nothing else changes — which is the
 * point of referencing avatars by id everywhere.
 *
 * Names are palette-ish and character-neutral so real artwork can inherit them
 * without the label suddenly describing the wrong picture.
 */

import type { Avatar } from "@/services/types";

const NAMES = [
  "Sunrise", "Meadow", "Harbour", "Ember", "Juniper", "Cobalt",
  "Saffron", "Thicket", "Lantern", "Quarry", "Marigold", "Drift",
  "Pebble", "Aurora", "Bramble", "Cinder", "Fathom", "Gale",
  "Hollow", "Kestrel", "Lumen", "Mosaic", "Nimbus", "Orchard",
  "Pennant", "Ripple", "Solstice", "Tundra", "Willow", "Zenith",
];

export const AVATARS: Avatar[] = NAMES.map((label, index) => ({
  id: `avatar-${String(index + 1).padStart(2, "0")}`,
  label,
  // asset: require(`@/assets/avatars/avatar-01.png`) — once artwork exists.
}));

const BY_ID = new Map(AVATARS.map((avatar) => [avatar.id, avatar]));

export function avatarById(id: string): Avatar | undefined {
  return BY_ID.get(id);
}

export const DEFAULT_AVATAR_ID = AVATARS[0].id;
