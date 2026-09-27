/**
 * Phase 3: discovery.
 *
 * The cases here are the ones that fail silently. A leaked coordinate, a
 * duplicated profile across pages, a gender filter that reveals what it was
 * supposed to hide — none of them throw, and none look wrong in a screenshot.
 */

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "@/app.js";
import { UserModel } from "@/models/user.model.js";
import { PassModel } from "@/models/pass.model.js";
import { toGeoJsonPoint } from "@/utils/geo.js";
import { buildProfiles, ANCHOR } from "@/seed/profiles.seed.js";
import { startTestEnv, stopTestEnv, wipe } from "./setup.js";

const app = createApp();
let counter = 0;

beforeAll(async () => {
  await startTestEnv();
  await UserModel.syncIndexes();
  await PassModel.syncIndexes();
});
afterAll(stopTestEnv);

/** A viewer standing exactly on the anchor, so distances are predictable. */
async function makeViewer() {
  counter += 1;
  const phoneNumber = String(7790000000 + counter);

  const code = await request(app).post("/v1/auth/code").send({ countryCode: "44", phoneNumber });
  const session = await request(app)
    .post("/v1/auth/verify")
    .send({ countryCode: "44", phoneNumber, code: code.body.devCode });

  const token = session.body.token as string;

  await request(app)
    .patch("/v1/me")
    .set("authorization", `Bearer ${token}`)
    .send({
      name: `Viewer${counter}`,
      birthday: "1995-05-05",
      location: { coordinate: { latitude: ANCHOR.latitude, longitude: ANCHOR.longitude } },
    });
  await request(app).post("/v1/auth/onboarding/complete").set("authorization", `Bearer ${token}`);

  return { token, userId: session.body.userId as string };
}

/** Inserts the seeded population directly — faster than shelling out to the seed. */
async function seedPeople(n = 40) {
  const profiles = buildProfiles().slice(0, n);
  await UserModel.insertMany(
    profiles.map((p, i) => ({
      phone: {
        e164: `+9910000${String(i).padStart(4, "0")}`,
        hmac: `seedhmac${i}`,
        countryCode: "99",
        national: `10000${String(i).padStart(4, "0")}`,
        display: `+99 10000 ${String(i).padStart(4, "0")}`,
      },
      name: p.name,
      nameLower: p.name.toLowerCase(),
      birthday: p.birthday,
      gender: p.gender,
      showGender: p.showGender,
      publicGenderKind: p.showGender ? p.gender.kind : "preferNotToSay",
      avatarId: p.avatarId,
      bio: p.bio,
      interestIds: p.interestIds,
      location: { point: toGeoJsonPoint(p.coordinate) },
      lastActiveAt: p.lastActiveAt,
      onboardingComplete: true,
      status: "active",
    })),
  );
}

beforeEach(async () => {
  await wipe();
  await seedPeople();
});

describe("what a profile may contain", () => {
  it("returns exactly PublicProfile and nothing else", async () => {
    const { token } = await makeViewer();
    const res = await request(app).get("/v1/profiles").set("authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);

    const allowed = new Set([
      "id", "name", "gender", "avatarId", "bio", "interestIds",
      "age", "distanceMetres", "lastActiveAt", "createdAt",
    ]);
    for (const p of res.body.items) {
      expect(new Set(Object.keys(p))).toEqual(allowed);
    }
  });

  it("never returns a coordinate, a birthday or a phone", async () => {
    const { token } = await makeViewer();
    const res = await request(app).get("/v1/profiles").set("authorization", `Bearer ${token}`);

    for (const p of res.body.items) {
      // Keys, not a substring scan — a bio legitimately contains the word
      // "phone" ("no phone signal"), which makes a text sweep lie.
      const keys = Object.keys(p);
      expect(keys).not.toContain("location");
      expect(keys).not.toContain("birthday");
      expect(keys).not.toContain("phone");
      expect(keys).not.toContain("showGender");
      expect(keys).not.toContain("publicGenderKind");
    }
  });

  it("quantises distance rather than returning exact metres", async () => {
    const { token } = await makeViewer();
    const res = await request(app).get("/v1/profiles").set("authorization", `Bearer ${token}`);

    for (const p of res.body.items) {
      const d = p.distanceMetres as number;
      expect(d % (d < 10_000 ? 100 : 1_000)).toBe(0);
    }
  });
});

describe("pagination", () => {
  it("never repeats or skips across pages", async () => {
    const { token } = await makeViewer();
    const seen: string[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < 5; page++) {
      const url: string = cursor ? `/v1/profiles?cursor=${encodeURIComponent(cursor)}` : "/v1/profiles";
      const res = await request(app).get(url).set("authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      seen.push(...res.body.items.map((p: { id: string }) => p.id));
      cursor = res.body.nextCursor;
      if (!cursor) break;
    }

    expect(seen.length).toBe(40);
    expect(new Set(seen).size).toBe(40);
  });

  it("stays stable when someone is INSERTED between two page fetches", async () => {
    // This is the whole reason the cursor is a keyset and not an offset. With
    // an offset, inserting a nearer profile shifts everything down by one and
    // page two silently skips whoever was at the boundary.
    const { token } = await makeViewer();

    const first = await request(app).get("/v1/profiles").set("authorization", `Bearer ${token}`);
    const firstIds = first.body.items.map((p: { id: string }) => p.id);

    // Someone brand new, and VERY close, so they sort to the front.
    await UserModel.create({
      phone: { e164: "+9911111111", hmac: "interloper", countryCode: "99", national: "11111111", display: "+99 1111 1111" },
      name: "Interloper",
      nameLower: "interloper",
      birthday: new Date("1994-01-01"),
      gender: { kind: "woman" },
      showGender: true,
      publicGenderKind: "woman",
      bio: "Arrived mid-pagination.",
      location: { point: toGeoJsonPoint({ latitude: ANCHOR.latitude, longitude: ANCHOR.longitude }) },
      onboardingComplete: true,
      status: "active",
    });

    const second = await request(app)
      .get(`/v1/profiles?cursor=${encodeURIComponent(first.body.nextCursor)}`)
      .set("authorization", `Bearer ${token}`);
    const secondIds = second.body.items.map((p: { id: string }) => p.id);

    // No overlap, which an offset cursor could not promise.
    expect(firstIds.filter((id: string) => secondIds.includes(id))).toEqual([]);
  });

  it("rejects a cursor minted for a different account", async () => {
    const a = await makeViewer();
    const b = await makeViewer();

    const page = await request(app).get("/v1/profiles").set("authorization", `Bearer ${a.token}`);
    const res = await request(app)
      .get(`/v1/profiles?cursor=${encodeURIComponent(page.body.nextCursor)}`)
      .set("authorization", `Bearer ${b.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("rejects a tampered cursor", async () => {
    const { token } = await makeViewer();
    const page = await request(app).get("/v1/profiles").set("authorization", `Bearer ${token}`);
    const tampered = `${String(page.body.nextCursor).slice(0, -4)}AAAA`;

    const res = await request(app)
      .get(`/v1/profiles?cursor=${encodeURIComponent(tampered)}`)
      .set("authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe("filters", () => {
  it("the gender filter NEVER excludes preferNotToSay", async () => {
    // Excluding them would reveal the hidden value: you would learn someone's
    // gender by noticing they disappeared from a filtered search.
    const { token } = await makeViewer();
    await UserModel.updateOne({ name: "Maya" }, { $set: { showGender: false, publicGenderKind: "preferNotToSay" } });

    const res = await request(app)
      .get("/v1/profiles?genders=woman&maxDistanceMetres=100000")
      .set("authorization", `Bearer ${token}`);

    const kinds = new Set(res.body.items.map((p: { gender: { kind: string } }) => p.gender.kind));
    expect(kinds.has("man")).toBe(false);
    expect([...kinds].every((k) => k === "woman" || k === "preferNotToSay")).toBe(true);
  });

  it("refuses a minAge below 18", async () => {
    const { token } = await makeViewer();
    const res = await request(app).get("/v1/profiles?minAge=16").set("authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("actually filters by distance", async () => {
    const { token } = await makeViewer();
    const near = await request(app).get("/v1/profiles/count?maxDistanceMetres=5000").set("authorization", `Bearer ${token}`);
    const far = await request(app).get("/v1/profiles/count?maxDistanceMetres=100000").set("authorization", `Bearer ${token}`);

    expect(near.body.count).toBeLessThan(far.body.count);
    expect(far.body.count).toBe(40);
  });

  it("excludes discoverable:false server-side", async () => {
    const { token } = await makeViewer();
    await UserModel.updateMany({ "phone.countryCode": "99" }, { $set: { "preferences.discoverable": false } });

    const res = await request(app).get("/v1/profiles/count").set("authorization", `Bearer ${token}`);
    expect(res.body.count).toBe(0);
  });
});

describe("passes", () => {
  it("removes someone from the deck, and is idempotent", async () => {
    const { token } = await makeViewer();
    const before = await request(app).get("/v1/profiles").set("authorization", `Bearer ${token}`);
    const target = before.body.items[0].id as string;

    const first = await request(app).post("/v1/passes").set("authorization", `Bearer ${token}`).send({ targetId: target });
    const again = await request(app).post("/v1/passes").set("authorization", `Bearer ${token}`).send({ targetId: target });
    expect(first.status).toBe(204);
    expect(again.status).toBe(204);

    const after = await request(app).get("/v1/profiles").set("authorization", `Bearer ${token}`);
    expect(after.body.items.map((p: { id: string }) => p.id)).not.toContain(target);
  });

  it("will not let you pass on yourself", async () => {
    const { token, userId } = await makeViewer();
    const res = await request(app).post("/v1/passes").set("authorization", `Bearer ${token}`).send({ targetId: userId });
    expect(res.status).toBe(400);
  });
});

describe("a single profile", () => {
  it("answers notFound — not unauthorized — for an id that does not exist", async () => {
    // `unauthorized` would confirm the account exists. That is the leak.
    const { token } = await makeViewer();
    const res = await request(app)
      .get("/v1/profiles/000000000000000000000000")
      .set("authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("notFound");
  });

  it("answers notFound for a malformed id rather than a 500", async () => {
    const { token } = await makeViewer();
    const res = await request(app).get("/v1/profiles/not-an-id").set("authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
