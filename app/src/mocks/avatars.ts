/**
 * The 30 preset avatars (A7).
 *
 * This is the entire "profile picture" system. There is no upload, camera,
 * crop or gallery anywhere in the product, so a user is one of these and
 * nothing else.
 *
 * ARTWORK EXISTS NOW — R2 and parking #12 are closed. Thirty illustrated
 * characters, never photographs: six skin tones used five times each, hair
 * from buzzed to waist-length, hijab, turban, cap and beanie, glasses, beards,
 * grey and dyed. A set that is mostly one kind of person is worse than no
 * choice at all, so the spread is the point rather than a nicety.
 *
 * TWO STRINGS PER ROW, deliberately:
 *
 *   `name`   the palette-ish word the id has always carried (Sunrise, Meadow).
 *            Never rendered — it is a stable handle for fixtures and logs.
 *   `label`  what the picture shows. This is what reaches `accessibilityLabel`,
 *            because "Sunrise" tells a screen-reader user nothing about which
 *            avatar they are choosing.
 *
 * `asset` is a PNG rather than a vector: `react-native-svg` is not on the
 * approved dependency list (app/AGENTS.md) and `expo-image` — which is already
 * here — renders PNG without adding one. Exported at 360px, which is 3x the
 * largest size `Avatar` draws.
 */

import type { Avatar } from "@/services/types";

export const AVATARS: Avatar[] = [
  {
    id: "avatar-01",
    name: "Sunrise",
    label: "Short brown hair, light-medium skin",
    asset: require("@/assets/avatars/avatar-01.png") as number,
  },
  {
    id: "avatar-02",
    name: "Meadow",
    label: "Afro, deep skin",
    asset: require("@/assets/avatars/avatar-02.png") as number,
  },
  {
    id: "avatar-03",
    name: "Harbour",
    label: "Long blonde hair, light skin",
    asset: require("@/assets/avatars/avatar-03.png") as number,
  },
  {
    id: "avatar-04",
    name: "Ember",
    label: "Locs, deep skin",
    asset: require("@/assets/avatars/avatar-04.png") as number,
  },
  {
    id: "avatar-05",
    name: "Juniper",
    label: "Top knot, medium skin",
    asset: require("@/assets/avatars/avatar-05.png") as number,
  },
  {
    id: "avatar-06",
    name: "Cobalt",
    label: "Short dark hair and glasses, light-medium skin",
    asset: require("@/assets/avatars/avatar-06.png") as number,
  },
  {
    id: "avatar-07",
    name: "Saffron",
    label: "Two braids, medium-deep skin",
    asset: require("@/assets/avatars/avatar-07.png") as number,
  },
  {
    id: "avatar-08",
    name: "Thicket",
    label: "Wavy auburn hair, light skin",
    asset: require("@/assets/avatars/avatar-08.png") as number,
  },
  {
    id: "avatar-09",
    name: "Lantern",
    label: "Wearing a hijab, medium skin",
    asset: require("@/assets/avatars/avatar-09.png") as number,
  },
  {
    id: "avatar-10",
    name: "Quarry",
    label: "Buzzed hair and a beard, very deep skin",
    asset: require("@/assets/avatars/avatar-10.png") as number,
  },
  {
    id: "avatar-11",
    name: "Marigold",
    label: "Blonde bob, light-medium skin",
    asset: require("@/assets/avatars/avatar-11.png") as number,
  },
  {
    id: "avatar-12",
    name: "Drift",
    label: "Short grey hair, medium skin",
    asset: require("@/assets/avatars/avatar-12.png") as number,
  },
  {
    id: "avatar-13",
    name: "Pebble",
    label: "Afro puffs, deep skin",
    asset: require("@/assets/avatars/avatar-13.png") as number,
  },
  {
    id: "avatar-14",
    name: "Aurora",
    label: "Pink pixie cut, light skin",
    asset: require("@/assets/avatars/avatar-14.png") as number,
  },
  {
    id: "avatar-15",
    name: "Bramble",
    label: "Curly dark brown hair, medium-deep skin",
    asset: require("@/assets/avatars/avatar-15.png") as number,
  },
  {
    id: "avatar-16",
    name: "Cinder",
    label: "Bald with a moustache, very deep skin",
    asset: require("@/assets/avatars/avatar-16.png") as number,
  },
  {
    id: "avatar-17",
    name: "Fathom",
    label: "Blue undercut, light-medium skin",
    asset: require("@/assets/avatars/avatar-17.png") as number,
  },
  {
    id: "avatar-18",
    name: "Gale",
    label: "Wearing a beanie, medium skin",
    asset: require("@/assets/avatars/avatar-18.png") as number,
  },
  {
    id: "avatar-19",
    name: "Hollow",
    label: "Long grey hair, light skin",
    asset: require("@/assets/avatars/avatar-19.png") as number,
  },
  {
    id: "avatar-20",
    name: "Kestrel",
    label: "Wearing a cap, medium-deep skin",
    asset: require("@/assets/avatars/avatar-20.png") as number,
  },
  {
    id: "avatar-21",
    name: "Lumen",
    label: "Long auburn hair and glasses, light-medium skin",
    asset: require("@/assets/avatars/avatar-21.png") as number,
  },
  {
    id: "avatar-22",
    name: "Mosaic",
    label: "Wearing a turban, deep skin",
    asset: require("@/assets/avatars/avatar-22.png") as number,
  },
  {
    id: "avatar-23",
    name: "Nimbus",
    label: "Blonde ponytail, light skin",
    asset: require("@/assets/avatars/avatar-23.png") as number,
  },
  {
    id: "avatar-24",
    name: "Orchard",
    label: "Bowl cut, medium skin",
    asset: require("@/assets/avatars/avatar-24.png") as number,
  },
  {
    id: "avatar-25",
    name: "Pennant",
    label: "Short crest of hair, light-medium skin",
    asset: require("@/assets/avatars/avatar-25.png") as number,
  },
  {
    id: "avatar-26",
    name: "Ripple",
    label: "Long locs, medium-deep skin",
    asset: require("@/assets/avatars/avatar-26.png") as number,
  },
  {
    id: "avatar-27",
    name: "Solstice",
    label: "Side-swept blonde hair with freckles, light skin",
    asset: require("@/assets/avatars/avatar-27.png") as number,
  },
  {
    id: "avatar-28",
    name: "Tundra",
    label: "Short grey hair and glasses, medium skin",
    asset: require("@/assets/avatars/avatar-28.png") as number,
  },
  {
    id: "avatar-29",
    name: "Willow",
    label: "Long braids, deep skin",
    asset: require("@/assets/avatars/avatar-29.png") as number,
  },
  {
    id: "avatar-30",
    name: "Zenith",
    label: "Short dark hair and a beard, light-medium skin",
    asset: require("@/assets/avatars/avatar-30.png") as number,
  },
];

const BY_ID = new Map(AVATARS.map((avatar) => [avatar.id, avatar]));

export function avatarById(id: string): Avatar | undefined {
  return BY_ID.get(id);
}

/**
 * The artwork for a stored `avatarId`, ready to hand to `Avatar`.
 *
 * Resolved LOCALLY in both transports. The server stores only an id and a
 * label — `GET /avatars` returns no artwork, and it should not: thirty images
 * that never change do not belong on the wire, and a bundled asset renders on
 * the first frame with no request to fail.
 *
 * Undefined for an empty id (nobody has chosen yet) and for an id this build
 * does not know, which is what keeps `Avatar` falling back to the initial
 * rather than rendering a hole.
 */
export function avatarSource(avatarId?: string | null): number | undefined {
  if (!avatarId) return undefined;
  return BY_ID.get(avatarId)?.asset;
}

export const DEFAULT_AVATAR_ID = AVATARS[0].id;
