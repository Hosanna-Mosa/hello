/**
 * Phase 2: the seed, and the properties that make it trustworthy.
 *
 * The whole point of seeding the SAME forty people the app shows on mocks is
 * that switching the app over should change nothing on screen. That is only
 * useful if it is actually true, so it is asserted against the app's own mock
 * rather than against a copy of it.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AvatarModel } from "@/models/avatar.model.js";
import { InterestModel } from "@/models/interest.model.js";
import { UserModel } from "@/models/user.model.js";
import { buildInterests } from "@/seed/interests.seed.js";
import { buildProfiles, ANCHOR } from "@/seed/profiles.seed.js";
import { haversineMetres } from "@/utils/geo.js";
import { slugify, legacySlug } from "@/utils/slug.js";

import { startTestEnv, stopTestEnv } from "./setup.js";

beforeAll(startTestEnv);
afterAll(stopTestEnv);

describe("the seed reproduces the app's mock", () => {
  const mine = buildProfiles();

  it("is byte-identical to the app's forty, distances included", async () => {
    // Delegated to tools/seed-parity.ts: it imports the app's CommonJS mocks,
    // which cannot enter this package's strict ESM program without breaking
    // the build for everything else. Non-zero exit = a mismatch.
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync("npx", ["tsx", "tools/seed-parity.ts"], { encoding: "utf8" });
    expect(out).toContain("seed parity OK");
  });

  it("has the same forty people", () => {
    expect(mine).toHaveLength(40);
  });

  it("spreads people either side of the 25km default, so the filter does something", () => {
    const distances = mine.map((p) => haversineMetres(ANCHOR, p.coordinate));
    const inside = distances.filter((d) => d <= 25_000).length;

    // Seeding the app's raw coordinates would have put all 40 inside.
    expect(inside).toBeGreaterThan(5);
    expect(inside).toBeLessThan(35);
    expect(Math.min(...distances)).toBeLessThan(5_000);
    expect(Math.max(...distances)).toBeGreaterThan(40_000);
  });

  it("nobody is near the 18 boundary by accident", () => {
    const now = Date.now();
    for (const p of mine) {
      const years = (now - p.birthday.getTime()) / (365.25 * 24 * 3600 * 1000);
      expect(years).toBeGreaterThan(18);
    }
  });
});

describe("interest ids", () => {
  it("survives accents instead of mangling them", () => {
    expect(slugify("Board game cafés")).toBe("board-game-cafes");
    expect(legacySlug("Board game cafés")).toBe("board-game-caf-s");
    expect(slugify("Café hopping")).toBe("cafe-hopping");
  });

  it("keeps the app's old id as an alias so existing references resolve", () => {
    const rows = buildInterests();
    const cafes = rows.find((r) => r._id === "board-game-cafes");
    expect(cafes?.aliases).toEqual(["board-game-caf-s"]);
  });

  it("OMITS aliases rather than storing an empty array", () => {
    // An empty array indexes as `undefined` on the unique sparse index and
    // collides with every other empty one. This is the guard for that.
    const withoutAlias = buildInterests().filter((r) => r._id !== "board-game-cafes");
    expect(withoutAlias.every((r) => r.aliases === undefined)).toBe(true);
  });

  it("covers all 60 across 8 categories", () => {
    const rows = buildInterests();
    expect(rows).toHaveLength(60);
    expect(new Set(rows.map((r) => r.category)).size).toBe(8);
    expect(new Set(rows.map((r) => r._id)).size).toBe(60);
  });
});

describe("seeded documents", () => {
  it("writes reference data and forty profiles, and is idempotent", async () => {
    const { execFileSync } = await import("node:child_process");
    const run = () =>
      execFileSync("npx", ["tsx", "scripts/seed.ts"], {
        env: { ...process.env, MONGO_DB: "hello_test", REDIS_PREFIX: "hello:test" },
        encoding: "utf8",
      });

    run();
    const first = {
      interests: await InterestModel.countDocuments(),
      avatars: await AvatarModel.countDocuments(),
      users: await UserModel.countDocuments(),
    };

    run();
    const second = {
      interests: await InterestModel.countDocuments(),
      avatars: await AvatarModel.countDocuments(),
      users: await UserModel.countDocuments(),
    };

    expect(first).toEqual({ interests: 60, avatars: 30, users: 40 });
    expect(second).toEqual(first);
  });

  it("never leaks a hidden gender", async () => {
    const hidden = await UserModel.find({ showGender: false });
    expect(hidden.length).toBeGreaterThan(0);
    for (const u of hidden) {
      expect(u.publicGenderKind).toBe("preferNotToSay");
    }
  });
});
