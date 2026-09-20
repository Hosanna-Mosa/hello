/**
 * Fixture volumes and invariants.
 *
 * The assumptions name specific counts (A6 ~60 interests, A7 ~30 avatars,
 * A8 ~40 profiles / ~8 threads / ~6 inbound likes). Asserting them here means
 * the seed data cannot quietly shrink, which is how a demo ends up showing
 * four people.
 */

import { AVATARS } from "@/mocks/avatars";
import { INTERESTS, INTERESTS_BY_CATEGORY } from "@/mocks/interests";
import { CURRENT_USER, SEEDED_USERS } from "@/mocks/profiles";
import {
  SEEDED_LIKES,
  SEEDED_MATCHES,
  SEEDED_MESSAGES,
  SEEDED_REQUESTS,
  SEEDED_THREADS,
} from "@/mocks/threads";
import { calculateAge } from "@/components/common/utils/calculateAge";

describe("fixture volumes", () => {
  it("has 60 interests across 8 categories (A6)", () => {
    expect(INTERESTS).toHaveLength(60);
    expect(Object.keys(INTERESTS_BY_CATEGORY)).toHaveLength(8);
    expect(Object.values(INTERESTS_BY_CATEGORY).every((g) => g.length > 0)).toBe(true);
  });

  it("has 30 preset avatars (A7)", () => {
    expect(AVATARS).toHaveLength(30);
  });

  it("has 40 seeded people (A8)", () => {
    expect(SEEDED_USERS).toHaveLength(40);
  });

  it("has 8 conversations and 6 inbound likes (A8)", () => {
    // 8 conversations plus one match with nothing said yet — the fixture the
    // new-matches carousel and the "no messages in a thread" state both need
    // (Phase 7). Every thread has a match behind it, hence 9 of each.
    expect(SEEDED_THREADS).toHaveLength(9);
    expect(SEEDED_MATCHES).toHaveLength(9);
    expect(SEEDED_THREADS.filter((t) => t.id === "thread-fresh")).toHaveLength(1);
    expect(SEEDED_LIKES).toHaveLength(6);
    // Three of the six carry a note, so three land as pending requests.
    expect(SEEDED_REQUESTS).toHaveLength(3);
  });
});

describe("fixture invariants", () => {
  it("every seeded person is 18 or over", () => {
    expect(SEEDED_USERS.every((u) => calculateAge(u.birthday) >= 18)).toBe(true);
  });

  it("ids are unique everywhere", () => {
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    expect(unique(SEEDED_USERS.map((u) => u.id))).toBe(true);
    expect(unique(INTERESTS.map((i) => i.id))).toBe(true);
    expect(unique(AVATARS.map((a) => a.id))).toBe(true);
    expect(unique(SEEDED_MESSAGES.map((m) => m.id))).toBe(true);
  });

  it("every person has 3+ interests and they all resolve", () => {
    const known = new Set(INTERESTS.map((i) => i.id));
    expect(SEEDED_USERS.every((u) => u.interestIds.length >= 3)).toBe(true);
    expect(SEEDED_USERS.every((u) => u.interestIds.every((id) => known.has(id)))).toBe(true);
  });

  it("every person has a bio and a resolvable avatar", () => {
    const known = new Set(AVATARS.map((a) => a.id));
    expect(SEEDED_USERS.every((u) => u.bio.trim().length > 0)).toBe(true);
    expect(SEEDED_USERS.every((u) => known.has(u.avatarId))).toBe(true);
  });

  it("the signed-in user starts empty, for onboarding to fill in", () => {
    expect(CURRENT_USER.name).toBe("");
    expect(CURRENT_USER.interestIds).toHaveLength(0);
  });

  it("every message belongs to a real thread, and every thread to a match", () => {
    const threadIds = new Set(SEEDED_THREADS.map((t) => t.id));
    const matchIds = new Set(SEEDED_MATCHES.map((m) => m.id));
    expect(SEEDED_MESSAGES.every((m) => threadIds.has(m.threadId))).toBe(true);
    expect(SEEDED_THREADS.every((t) => matchIds.has(t.matchId))).toBe(true);
  });

  it("no bio uses romantic framing", () => {
    // The seed data is the one place the product speaks in a human voice, so
    // it is where platonic positioning is most likely to leak.
    const banned = /\b(date|dating|romantic|flirt|single|partner|soulmate|chemistry|hook ?up)\b/i;
    const offenders = SEEDED_USERS.filter((u) => banned.test(u.bio)).map((u) => u.bio);
    expect(offenders).toEqual([]);
  });
});
