/**
 * The avatar fixtures, guarded.
 *
 * Two modules hold the same ids — `avatars.ts` (which requires a PNG per row,
 * so it only loads under Metro) and `avatarIds.ts` (which requires nothing, so
 * the backend's seed-parity tool can load it). Split for a real reason; worth
 * one test so they cannot drift apart silently.
 */

import { AVATARS, avatarById, avatarSource, DEFAULT_AVATAR_ID } from "@/mocks/avatars";
import { AVATAR_IDS } from "@/mocks/avatarIds";

describe("the preset avatars", () => {
  it("is thirty, with the ids the backend seeds", () => {
    expect(AVATARS).toHaveLength(30);
    expect(AVATARS.map((a) => a.id)).toEqual([...AVATAR_IDS]);
  });

  it("every one has artwork — a missing file would silently fall back to an initial", () => {
    const withoutArt = AVATARS.filter((a) => a.asset === undefined).map((a) => a.id);
    expect(withoutArt).toEqual([]);
  });

  it("every one has a label describing the person, not a palette word", () => {
    for (const avatar of AVATARS) {
      // "Sunrise" tells a screen-reader user nothing; "Afro, deep skin" does.
      expect(avatar.label.length).toBeGreaterThan(10);
      expect(avatar.label).not.toBe(avatar.name);
    }
  });

  it("uses artwork no more than once", () => {
    const assets = AVATARS.map((a) => a.asset);
    expect(new Set(assets).size).toBe(assets.length);
  });

  it("resolves a stored id to its artwork, and an unknown one to nothing", () => {
    expect(avatarSource("avatar-01")).toBe(avatarById("avatar-01")?.asset);
    expect(avatarSource("avatar-99")).toBeUndefined();
    // Nobody has chosen yet — the caller must get the initial fallback.
    expect(avatarSource("")).toBeUndefined();
    expect(avatarSource(undefined)).toBeUndefined();
    expect(avatarSource(null)).toBeUndefined();
  });

  it("defaults to the first", () => {
    expect(DEFAULT_AVATAR_ID).toBe("avatar-01");
  });
});
