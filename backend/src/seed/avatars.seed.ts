/**
 * The 30 preset avatars, ported from `app/src/mocks/avatars.ts`.
 * Ids are `avatar-01` … `avatar-30`, matching the app exactly.
 *
 * THE ARTWORK IS NOT HERE and never will be. The server stores an id and a
 * label; the images are bundled in the app. Thirty pictures that never change
 * do not belong on the wire, and a bundled asset draws on the first frame with
 * no request to fail.
 *
 * `label` describes the person — it is what reaches `accessibilityLabel`, and
 * "Sunrise" tells a screen-reader user nothing about which avatar they are
 * choosing. `name` is the old palette word, kept as a stable handle.
 */

const AVATARS: { name: string; label: string }[] = [
  { name: "Sunrise", label: "Short brown hair, light-medium skin" },
  { name: "Meadow", label: "Afro, deep skin" },
  { name: "Harbour", label: "Long blonde hair, light skin" },
  { name: "Ember", label: "Locs, deep skin" },
  { name: "Juniper", label: "Top knot, medium skin" },
  { name: "Cobalt", label: "Short dark hair and glasses, light-medium skin" },
  { name: "Saffron", label: "Two braids, medium-deep skin" },
  { name: "Thicket", label: "Wavy auburn hair, light skin" },
  { name: "Lantern", label: "Wearing a hijab, medium skin" },
  { name: "Quarry", label: "Buzzed hair and a beard, very deep skin" },
  { name: "Marigold", label: "Blonde bob, light-medium skin" },
  { name: "Drift", label: "Short grey hair, medium skin" },
  { name: "Pebble", label: "Afro puffs, deep skin" },
  { name: "Aurora", label: "Pink pixie cut, light skin" },
  { name: "Bramble", label: "Curly dark brown hair, medium-deep skin" },
  { name: "Cinder", label: "Bald with a moustache, very deep skin" },
  { name: "Fathom", label: "Blue undercut, light-medium skin" },
  { name: "Gale", label: "Wearing a beanie, medium skin" },
  { name: "Hollow", label: "Long grey hair, light skin" },
  { name: "Kestrel", label: "Wearing a cap, medium-deep skin" },
  { name: "Lumen", label: "Long auburn hair and glasses, light-medium skin" },
  { name: "Mosaic", label: "Wearing a turban, deep skin" },
  { name: "Nimbus", label: "Blonde ponytail, light skin" },
  { name: "Orchard", label: "Bowl cut, medium skin" },
  { name: "Pennant", label: "Short crest of hair, light-medium skin" },
  { name: "Ripple", label: "Long locs, medium-deep skin" },
  { name: "Solstice", label: "Side-swept blonde hair with freckles, light skin" },
  { name: "Tundra", label: "Short grey hair and glasses, medium skin" },
  { name: "Willow", label: "Long braids, deep skin" },
  { name: "Zenith", label: "Short dark hair and a beard, light-medium skin" },
];

export type AvatarSeed = { _id: string; name: string; label: string; sortOrder: number };

export function buildAvatars(): AvatarSeed[] {
  return AVATARS.map((avatar, i) => ({
    _id: `avatar-${String(i + 1).padStart(2, "0")}`,
    name: avatar.name,
    label: avatar.label,
    sortOrder: i,
  }));
}
