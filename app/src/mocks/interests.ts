/**
 * The interest taxonomy — 60 tags across 8 categories (A6).
 *
 * Load-bearing rather than decorative: with no photographs anywhere, these and
 * the bio are what carry a profile card. Placeholder taxonomy; the client is
 * expected to revise the wording, which is a change to this file alone.
 *
 * Nothing here is romantic, suggestive, or about looking for a partner. The
 * vocabulary is where the platonic positioning either holds or leaks.
 */

import type { Interest, InterestCategory } from "@/services/types";

export const INTEREST_CATEGORY_LABELS: Record<InterestCategory, string> = {
  outdoors: "Outdoors",
  food: "Food & drink",
  games: "Games",
  music: "Music",
  creative: "Creative",
  wellbeing: "Wellbeing",
  learning: "Learning",
  nightlife: "Going out",
};

function make(category: InterestCategory, labels: string[]): Interest[] {
  return labels.map((label) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    category,
  }));
}

export const INTERESTS: Interest[] = [
  ...make("outdoors", [
    "Hiking", "Running", "Cycling", "Climbing",
    "Camping", "Wild swimming", "Kayaking", "Gardening",
  ]),
  ...make("food", [
    "Coffee", "Baking", "Street food", "Vegan cooking",
    "Wine", "Brunch", "Barbecue", "Farmers markets",
  ]),
  ...make("games", [
    "Board games", "Video games", "Chess", "Pub quizzes",
    "Tabletop RPGs", "Puzzles", "Card games",
  ]),
  ...make("music", [
    "Live gigs", "Vinyl", "Jazz", "Hip hop",
    "Indie", "Classical", "Karaoke", "Making music",
  ]),
  ...make("creative", [
    "Photography", "Drawing", "Writing", "Pottery",
    "Knitting", "Film", "Theatre", "DIY",
  ]),
  ...make("wellbeing", [
    "Yoga", "Meditation", "The gym", "Pilates",
    "Long walks", "Cold water swimming", "Batch cooking",
  ]),
  ...make("learning", [
    "Languages", "History", "Astronomy", "Podcasts",
    "Book club", "Museums", "Coding",
  ]),
  ...make("nightlife", [
    "Bars", "Dancing", "Comedy nights", "Cocktails",
    "Board game cafés", "Late films", "Supper clubs",
  ]),
];

/** Grouped for the onboarding picker and the filter sheet. */
export const INTERESTS_BY_CATEGORY: Record<InterestCategory, Interest[]> =
  INTERESTS.reduce(
    (grouped, interest) => {
      grouped[interest.category].push(interest);
      return grouped;
    },
    {
      outdoors: [], food: [], games: [], music: [],
      creative: [], wellbeing: [], learning: [], nightlife: [],
    } as Record<InterestCategory, Interest[]>,
  );

const BY_ID = new Map(INTERESTS.map((interest) => [interest.id, interest]));

export function interestById(id: string): Interest | undefined {
  return BY_ID.get(id);
}

export function interestsByIds(ids: readonly string[]): Interest[] {
  return ids.map(interestById).filter((i): i is Interest => Boolean(i));
}
