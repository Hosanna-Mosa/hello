/**
 * The 40 seeded people, ported from `app/src/mocks/profiles.ts`.
 *
 * Same mulberry32, same seed (20260919), same NAMES and BIOS arrays and the
 * same draw order — so names, ages, bios, genders and interests come out
 * byte-identical to the app's mock. Switching the app from mocks to this API
 * should therefore change nothing on screen, which is what makes any difference
 * you DO see a real bug.
 *
 * THE ONE DELIBERATE CHANGE IS LOCATION.
 *
 * The mock stores a coordinate jittered +/-0.2 degrees around London, but the
 * distance shown on a card comes from a SEPARATE random map (400m-60km) with no
 * relationship to it. With `$geoNear` computing distance for real, that lie
 * stops working — and seeding the coordinates as-is measures out at min 3.3km,
 * median 14.8km, max 22.6km, i.e. ALL FORTY inside the 25km default filter.
 * The distance slider would then filter nothing and no card would ever read
 * "under 1 km".
 *
 * The fix turned out to be better than a reconciliation. The app's loop ends
 * with one more draw than it looks like it does:
 *
 *     distances.set(id, 400 + Math.floor(random() * 59_600));
 *
 * That is the number actually printed on every card today. So rather than
 * inventing a distance curve, this seed CONSUMES THE SAME DRAW and uses it as
 * the real distance, then places the coordinate at that distance on a bearing
 * taken from the draw the app spent on latitude. Every draw is consumed in the
 * same order and the same quantity, so names, ages, bios, genders and interests
 * stay byte-identical — AND the km on each card comes out the same as the mock,
 * which is the strongest possible form of "a difference you see is a bug".
 *
 * Missing that one draw is what made the first attempt diverge from user-02
 * onward while user-01 matched perfectly: the offset only bites on the NEXT
 * iteration.
 */

import { env } from "@/config/env.js";
import { buildAvatars } from "@/seed/avatars.seed.js";
import { buildInterests } from "@/seed/interests.seed.js";
import { destination, type LatLng } from "@/utils/geo.js";

/** mulberry32 — identical to the app's, including the integer overflow behaviour. */
function seeded(seed: number) {
  return function next(): number {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  "Maya", "Daniel", "Priya", "Tom", "Aisha", "Leo", "Nina", "Omar",
  "Grace", "Hugo", "Sofia", "Kwame", "Elena", "Marcus", "Yuki", "Ravi",
  "Clara", "Jonas", "Amara", "Finn", "Zara", "Theo", "Ingrid", "Mateo",
  "Lena", "Idris", "Hana", "Felix", "Rosa", "Arjun", "Freya", "Samir",
  "Nadia", "Oscar", "Bea", "Ezra", "Talia", "Noor", "Callum", "Iris",
];

const BIOS = [
  "Weekend hiker, terrible cook. Always up for a quiz night.",
  "New to the area and looking for people to explore it with.",
  "I will talk about films for far longer than you want me to.",
  "Trying to get back into climbing after two years off.",
  "Board games, long walks, and an unreasonable number of houseplants.",
  "Chef by trade, so I cook for friends constantly. Bring an appetite.",
  "Looking for a running buddy who is also slow.",
  "I make bad pottery and I am at peace with that.",
  "Recently moved for work and my whole social circle is 200 miles away.",
  "Will absolutely drag you to a gig you have never heard of.",
  "Part-time historian, full-time podcast listener.",
  "Up early most weekends for a swim. Come suffer with me.",
  "Learning Portuguese very slowly. Happy to practise with someone.",
  "Happiest in a pub with a card game and no phone signal.",
  "Photographer. Mostly of other people's dogs.",
  "I host a monthly supper club and always need more chairs filled.",
  "Cycling to every café within 20 km, one at a time.",
  "Quiet company, good books, strong coffee.",
  "Ex-theatre kid. It shows.",
  "Trying to go to one museum a month. Currently behind.",
  "I garden badly but enthusiastically.",
  "Weeknight gym, weekend nothing. Balance.",
  "Always looking for someone to test recipes on.",
  "Big walks, small talk optional.",
  "Just here for board game cafés and honest opinions on beer.",
  "Writing a novel nobody asked for. Ask me about it anyway.",
  "Camping in all weather. Especially bad weather.",
  "I know every good bakery in this city and will prove it.",
  "Astronomy nerd with a telescope and no patience.",
  "Learning to skate at an age I should probably not be learning to skate.",
  "Karaoke enthusiast. Genuinely not a good singer.",
  "Long drives, no destination, one very specific playlist.",
  "Vegan cooking, mostly successful.",
  "Chess in the park on Sundays if the weather holds.",
  "New parent, limited hours, still want a life.",
  "I go to the cinema alone a lot and would rather not.",
  "Knitting, true crime podcasts, and a cat who hates both.",
  "Trying every comedy night in town until I find a good one.",
  "Runner, reader, mediocre guitarist.",
  "Looking for people who also think 9pm is late.",
];

/**
 * The point the seeded people are scattered around.
 *
 * London by default, matching the app's mock data — but overridable, because a
 * tester more than 100 km away (the discovery cap) sees a correctly empty deck
 * and no way to tell that from a bug.
 */
const ANCHOR: LatLng = { latitude: env.SEED_ANCHOR_LAT, longitude: env.SEED_ANCHOR_LNG };

/** The app's own range: `400 + random * 59_600`. Kept exactly. */
const NEAREST_M = 400;
const SPREAD_M = 59_600;

export type ProfileSeed = {
  legacyId: string;
  name: string;
  birthday: Date;
  gender: { kind: "woman" | "man" | "nonBinary" };
  showGender: boolean;
  avatarId: string;
  bio: string;
  interestIds: string[];
  coordinate: LatLng;
  lastActiveAt: Date;
  createdAt: Date;
};

export function buildProfiles(now: Date = new Date()): ProfileSeed[] {
  const random = seeded(20260919);
  const interests = buildInterests();
  const avatars = buildAvatars();
  const rows: ProfileSeed[] = [];

  for (let index = 0; index < NAMES.length; index += 1) {
    // 19-42, so nobody is ever near the 18 boundary by accident.
    const age = 19 + Math.floor(random() * 24);
    const birthday = new Date(now);
    birthday.setUTCFullYear(now.getUTCFullYear() - age);
    birthday.setUTCMonth(Math.floor(random() * 12));
    birthday.setUTCDate(1 + Math.floor(random() * 27));

    const pool = [...interests];
    const count = 3 + Math.floor(random() * 4);
    const interestIds: string[] = [];
    for (let n = 0; n < count; n += 1) {
      const [picked] = pool.splice(Math.floor(random() * pool.length), 1);
      if (picked) interestIds.push(picked._id);
    }

    const genderRoll = random();
    const gender: ProfileSeed["gender"] =
      genderRoll < 0.45 ? { kind: "woman" } : genderRoll < 0.9 ? { kind: "man" } : { kind: "nonBinary" };

    const lastActiveMinutesAgo = Math.floor(random() * 7200);
    const showGender = random() > 0.2;

    // The app spends this on a latitude jitter; here it becomes the bearing.
    const bearing = random() * 360;
    // The longitude jitter. Consumed to stay aligned, deliberately unused.
    void random();

    rows.push({
      legacyId: `user-${String(index + 1).padStart(2, "0")}`,
      name: NAMES[index] ?? "",
      birthday,
      gender,
      showGender,
      avatarId: avatars[index % avatars.length]?._id ?? "avatar-01",
      bio: BIOS[index] ?? "",
      interestIds,
      // Filled in below, once the distance draw has been taken in app order.
      coordinate: { latitude: 0, longitude: 0 },
      lastActiveAt: new Date(now.getTime() - lastActiveMinutesAgo * 60_000),
      createdAt: new Date(now.getTime() - Math.floor(random() * 300) * 86_400_000),
    });

    // The app's final draw of the iteration — its MOCK_DISTANCES value, which
    // is the distance the card shows today. Here it is the real one.
    const distanceM = NEAREST_M + Math.floor(random() * SPREAD_M);
    rows[rows.length - 1]!.coordinate = destination(ANCHOR, distanceM, bearing);
  }

  return rows;
}

export { ANCHOR };
