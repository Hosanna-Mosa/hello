/**
 * 40 seeded people, plus the signed-in user (A8).
 *
 * Generated from fixed pools with a seeded PRNG rather than `Math.random`, so
 * the same data appears on every launch. That matters twice: render-tree
 * snapshots would otherwise churn, and a client poking at the demo should see
 * the same faces they saw yesterday.
 *
 * Every bio here is platonic. No one is looking for a date, a partner, or
 * "something more" — the seed data is where that positioning is most likely to
 * leak, because it is the only place the product speaks in a human voice.
 *
 * Everyone is 18+ by construction.
 */

import type { IsoDate, IsoDateTime, User } from "@/services/types";

import { AVATAR_IDS } from "./avatarIds";
import { INTERESTS } from "./interests";

/** mulberry32 — small, fast, and identical on every platform. */
function seeded(seed: number) {
  return function next() {
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

/** Rough city-centre anchor. A12: coarse only, never a precise point. */
const ANCHOR = { latitude: 51.5074, longitude: -0.1278 };

function isoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

function build(): { users: User[]; distances: Map<string, number> } {
  const random = seeded(20260919);
  const users: User[] = [];
  const distances = new Map<string, number>();

  // Anchored to the real clock, like the conversation seed. A hardcoded date
  // would freeze every age and push "last active" ever further into the past,
  // so `activeRecently` would eventually match nobody. The PRNG is what keeps
  // the data identical run to run; only the absolute dates move.
  const now = new Date();

  for (let index = 0; index < NAMES.length; index += 1) {
    const id = `user-${String(index + 1).padStart(2, "0")}`;

    // 19–42, so nobody is ever near the 18 boundary by accident.
    const age = 19 + Math.floor(random() * 24);
    const birthday = new Date(now);
    birthday.setFullYear(now.getFullYear() - age);
    birthday.setMonth(Math.floor(random() * 12));
    birthday.setDate(1 + Math.floor(random() * 27));

    // 3–6 interests, drawn without repeats.
    const pool = [...INTERESTS];
    const count = 3 + Math.floor(random() * 4);
    const interestIds: string[] = [];
    for (let n = 0; n < count; n += 1) {
      const [picked] = pool.splice(Math.floor(random() * pool.length), 1);
      if (picked) interestIds.push(picked.id);
    }

    const genderRoll = random();
    const gender: User["gender"] =
      genderRoll < 0.45
        ? { kind: "woman" }
        : genderRoll < 0.9
          ? { kind: "man" }
          : { kind: "nonBinary" };

    // Active within the last ~5 days; some in the last hour so
    // "active recently" has something to filter on.
    const lastActiveMinutesAgo = Math.floor(random() * 7200);
    const lastActiveAt: IsoDateTime = new Date(
      now.getTime() - lastActiveMinutesAgo * 60_000,
    ).toISOString();

    users.push({
      id,
      name: NAMES[index],
      birthday: isoDate(birthday),
      gender,
      showGender: random() > 0.2,
      avatarId: AVATAR_IDS[index % AVATAR_IDS.length],
      bio: BIOS[index],
      interestIds,
      location: {
        coordinate: {
          latitude: ANCHOR.latitude + (random() - 0.5) * 0.4,
          longitude: ANCHOR.longitude + (random() - 0.5) * 0.4,
        },
      },
      lastActiveAt,
      createdAt: new Date(now.getTime() - Math.floor(random() * 300) * 86_400_000).toISOString(),
    });

    // 400 m – 60 km. Displayed distance comes from here, not from the
    // coordinate (A12).
    distances.set(id, 400 + Math.floor(random() * 59_600));
  }

  return { users, distances };
}

const built = build();

export const SEEDED_USERS: User[] = built.users;

/** Mock distance from the signed-in user, in metres. */
export const MOCK_DISTANCES: Map<string, number> = built.distances;

/** The signed-in user. Starts empty — onboarding fills it in. */
export const CURRENT_USER: User = {
  id: "me",
  name: "",
  birthday: "",
  gender: { kind: "preferNotToSay" },
  showGender: true,
  avatarId: "",
  bio: "",
  interestIds: [],
  location: { coordinate: ANCHOR },
  lastActiveAt: "2026-09-19T12:00:00.000Z",
  createdAt: "2026-09-19T12:00:00.000Z",
};

const BY_ID = new Map(SEEDED_USERS.map((user) => [user.id, user]));

export function userById(id: string): User | undefined {
  return id === CURRENT_USER.id ? CURRENT_USER : BY_ID.get(id);
}
