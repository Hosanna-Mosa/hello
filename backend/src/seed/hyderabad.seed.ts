/**
 * Fifty extra people in Hyderabad, on top of the 40 mock-parity profiles.
 *
 * Kept apart from `profiles.seed.ts` on purpose: that file is byte-for-byte
 * aligned with the app's mock data, and adding people there would break the
 * "a difference you see is a bug" guarantee it exists for.
 *
 * Everyone is placed in a real neighbourhood (100 m – 1 km of jitter around its
 * centre), so cards read like the city — Gachibowli, Kukatpally, Secunderabad —
 * rather than points scattered on a circle. Deterministic: every run produces
 * the same fifty people.
 */

import { buildAvatars } from "@/seed/avatars.seed.js";
import { buildInterests } from "@/seed/interests.seed.js";
import type { ProfileSeed } from "@/seed/profiles.seed.js";
import { destination, type LatLng } from "@/utils/geo.js";

/** mulberry32, as in `profiles.seed.ts`. */
function seeded(seed: number) {
  return function next(): number {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Neighbourhood centres, roughly. */
const AREAS: [string, LatLng][] = [
  ["Gachibowli", { latitude: 17.4401, longitude: 78.3489 }],
  ["HITEC City", { latitude: 17.4435, longitude: 78.3772 }],
  ["Madhapur", { latitude: 17.4483, longitude: 78.3915 }],
  ["Kondapur", { latitude: 17.4697, longitude: 78.3578 }],
  ["Kukatpally", { latitude: 17.4849, longitude: 78.4138 }],
  ["KPHB", { latitude: 17.493, longitude: 78.399 }],
  ["Miyapur", { latitude: 17.4968, longitude: 78.3614 }],
  ["Nizampet", { latitude: 17.5151, longitude: 78.383 }],
  ["Bachupally", { latitude: 17.5446, longitude: 78.3843 }],
  ["Jubilee Hills", { latitude: 17.4326, longitude: 78.4071 }],
  ["Banjara Hills", { latitude: 17.4156, longitude: 78.4347 }],
  ["Ameerpet", { latitude: 17.4375, longitude: 78.4482 }],
  ["Begumpet", { latitude: 17.4447, longitude: 78.4664 }],
  ["Secunderabad", { latitude: 17.4399, longitude: 78.4983 }],
  ["Tarnaka", { latitude: 17.4265, longitude: 78.5395 }],
  ["Uppal", { latitude: 17.4058, longitude: 78.5591 }],
  ["Dilsukhnagar", { latitude: 17.3688, longitude: 78.5247 }],
  ["LB Nagar", { latitude: 17.3457, longitude: 78.5522 }],
  ["Mehdipatnam", { latitude: 17.3959, longitude: 78.4312 }],
  ["Tolichowki", { latitude: 17.3988, longitude: 78.4155 }],
  ["Manikonda", { latitude: 17.4058, longitude: 78.3747 }],
  ["Attapur", { latitude: 17.3707, longitude: 78.4322 }],
  ["Kompally", { latitude: 17.5364, longitude: 78.4854 }],
  ["Abids", { latitude: 17.3924, longitude: 78.4764 }],
  ["Charminar", { latitude: 17.3616, longitude: 78.4747 }],
];

const PEOPLE: [string, ProfileSeed["gender"]["kind"]][] = [
  ["Aarav", "man"], ["Ananya", "woman"], ["Karthik", "man"], ["Sneha", "woman"], ["Vikram", "man"],
  ["Divya", "woman"], ["Rahul", "man"], ["Meghana", "woman"], ["Sai Teja", "man"], ["Harini", "woman"],
  ["Arjun", "man"], ["Lakshmi", "woman"], ["Nikhil", "man"], ["Pooja", "woman"], ["Srikanth", "man"],
  ["Keerthi", "woman"], ["Abhishek", "man"], ["Swathi", "woman"], ["Faizan", "man"], ["Ayesha", "woman"],
  ["Rohit", "man"], ["Bhavana", "woman"], ["Varun", "man"], ["Sravani", "woman"], ["Imran", "man"],
  ["Sana", "woman"], ["Manoj", "man"], ["Deepika", "woman"], ["Akhil", "man"], ["Niharika", "woman"],
  ["Pranav", "man"], ["Tejaswini", "woman"], ["Harsha", "man"], ["Mounika", "woman"], ["Sameer", "man"],
  ["Zoya", "woman"], ["Chaitanya", "man"], ["Ramya", "woman"], ["Vamsi", "man"], ["Anjali", "woman"],
  ["Kiran", "nonBinary"], ["Revathi", "woman"], ["Siddharth", "man"], ["Madhuri", "woman"], ["Yash", "man"],
  ["Hema", "woman"], ["Naveen", "man"], ["Shruti", "woman"], ["Arif", "man"], ["Priyanka", "woman"],
];

/** Platonic, like the product. One is empty — a real share of people skip the bio. */
const BIOS = [
  "New to Hyderabad for work — looking for people to explore the city with.",
  "Weekend biryani hunts. I have opinions about Paradise vs Bawarchi.",
  "Morning runs around KBR Park. Always happy to have company.",
  "Board games, filter coffee and long chats. Looking for a game night crew.",
  "Trying every café in Jubilee Hills, one weekend at a time.",
  "Software by day, badminton by night. Need a doubles partner!",
  "Moved from Vizag last year and still finding my people here.",
  "Book club regular. Currently reading anything by Amitav Ghosh.",
  "Photography walks in the old city — Charminar at sunrise is unbeatable.",
  "Learning to cook Hyderabadi food properly. Taste testers welcome.",
  "Cricket on Sunday mornings, anyone?",
  "Trekking fan — Ananthagiri Hills is my happy place.",
  "Musician on weekends. Looking for jam buddies.",
  "Just here for good conversations and better chai.",
  "Cycling around Gandipet on weekends. Join me.",
  "Standup comedy nights, then street food after. That is the plan.",
  "",
];

export type HyderabadProfileSeed = ProfileSeed & { area: string };

export function buildHyderabadProfiles(now: Date = new Date()): HyderabadProfileSeed[] {
  const random = seeded(500_081); // a Hyderabad PIN code
  const interests = buildInterests();
  const avatars = buildAvatars();

  return PEOPLE.map(([name, kind], index) => {
    const age = 20 + Math.floor(random() * 16); // 20–35
    const birthday = new Date(now);
    birthday.setUTCFullYear(now.getUTCFullYear() - age);
    birthday.setUTCMonth(Math.floor(random() * 12));
    birthday.setUTCDate(1 + Math.floor(random() * 27));

    const pool = [...interests];
    const interestIds: string[] = [];
    const count = 3 + Math.floor(random() * 4);
    for (let n = 0; n < count; n += 1) {
      const [picked] = pool.splice(Math.floor(random() * pool.length), 1);
      if (picked) interestIds.push(picked._id);
    }

    const [area, centre] = AREAS[index % AREAS.length]!;
    const coordinate = destination(centre, 100 + Math.floor(random() * 900), random() * 360);

    return {
      legacyId: `hyd-${String(index + 1).padStart(2, "0")}`,
      name,
      birthday,
      gender: { kind },
      showGender: random() > 0.2,
      avatarId: avatars[index % avatars.length]?._id ?? "avatar-01",
      bio: BIOS[index % BIOS.length] ?? "",
      interestIds,
      coordinate,
      lastActiveAt: new Date(now.getTime() - Math.floor(random() * 4320) * 60_000),
      createdAt: new Date(now.getTime() - Math.floor(random() * 120) * 86_400_000),
      area,
    };
  });
}
