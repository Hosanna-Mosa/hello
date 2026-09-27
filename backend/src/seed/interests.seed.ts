/**
 * The 60 interests, ported verbatim from `app/src/mocks/interests.ts`.
 *
 * Labels and categories are identical to the app's, so a profile seeded here
 * renders exactly as it does on mocks. The IDS differ in four places, all of
 * them accents that the app's slug rule mangled — and each keeps the old id as
 * an alias so existing references resolve.
 */

import { slugify, legacySlug } from "@/utils/slug.js";
import type { INTEREST_CATEGORIES } from "@/models/interest.model.js";

type Category = (typeof INTEREST_CATEGORIES)[number];

const TAXONOMY: Record<Category, string[]> = {
  outdoors: ["Hiking", "Running", "Cycling", "Climbing", "Camping", "Wild swimming", "Kayaking", "Gardening"],
  food: ["Coffee", "Baking", "Street food", "Vegan cooking", "Wine", "Brunch", "Barbecue", "Farmers markets"],
  games: ["Board games", "Video games", "Chess", "Pub quizzes", "Tabletop RPGs", "Puzzles", "Card games"],
  music: ["Live gigs", "Vinyl", "Jazz", "Hip hop", "Indie", "Classical", "Karaoke", "Making music"],
  creative: ["Photography", "Drawing", "Writing", "Pottery", "Knitting", "Film", "Theatre", "DIY"],
  wellbeing: ["Yoga", "Meditation", "The gym", "Pilates", "Long walks", "Cold water swimming", "Batch cooking"],
  learning: ["Languages", "History", "Astronomy", "Podcasts", "Book club", "Museums", "Coding"],
  nightlife: ["Bars", "Dancing", "Comedy nights", "Cocktails", "Board game cafés", "Late films", "Supper clubs"],
};

export type InterestSeed = {
  _id: string;
  label: string;
  category: Category;
  /**
   * OMITTED entirely when there is no alias, never `[]`.
   *
   * A unique sparse index over an array indexes an EMPTY array as `undefined`,
   * and `sparse` does not exclude that — so 59 rows carrying `aliases: []`
   * collide with each other on the first insert. Absent is excluded; empty is
   * not. This cost a confusing `dup key: { aliases: undefined }`.
   */
  aliases?: string[];
  sortOrder: number;
};

export function buildInterests(): InterestSeed[] {
  const rows: InterestSeed[] = [];
  let order = 0;

  for (const [category, labels] of Object.entries(TAXONOMY) as [Category, string[]][]) {
    for (const label of labels) {
      const id = slugify(label);
      const legacy = legacySlug(label);
      rows.push({
        _id: id,
        label,
        category,
        // Only when the app's rule produced something different. Otherwise the
        // key is left off completely — see the note on the type.
        ...(legacy === id ? {} : { aliases: [legacy] }),
        sortOrder: order++,
      });
    }
  }

  return rows;
}
