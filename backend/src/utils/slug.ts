/**
 * Slug minting for taxonomy ids.
 *
 * The app derives interest ids from labels AT READ TIME, which makes the id a
 * function of the display text — so renaming "Board games" to "Board gaming"
 * silently orphans every profile that referenced it. Worse, the naive
 * `[^a-z0-9]+ -> -` mangles accents: "Board game cafés" becomes
 * `board-game-caf-s` and "Café hopping" becomes `caf-hopping`.
 *
 * Two fixes, and the second is the one that matters:
 *
 * 1. NFKD-normalise and strip combining marks, so `é` becomes `e` rather than
 *    being deleted. `board-game-cafes`, not `board-game-caf-s`.
 * 2. Ids are minted ONCE by the seed and stored. After that the label is free
 *    to change and the id never does. That is what actually prevents orphaning
 *    — the normalisation just makes the initial ids readable.
 */

export function slugify(label: string): string {
  return label
    .normalize("NFKD")
    // Strip combining marks left behind by the decomposition.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** What the app's current (broken) rule produces — kept as an alias so existing data resolves. */
export function legacySlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
