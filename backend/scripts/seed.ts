/**
 * Seeds reference data and the 40 demo profiles.
 *
 * IDEMPOTENT: every write is an upsert keyed on a stable id, so running it
 * twice leaves the database in the same state as running it once. A seed that
 * can only be run against an empty database is a seed nobody dares run.
 *
 * The seeded people are the same forty the app shows on mocks — same names,
 * bios, ages, genders, avatars, interests and DISTANCES. That is deliberate:
 * when the app is pointed at this API the screen should look identical, so
 * anything that does change is a bug rather than a question.
 *
 * Seeded accounts get a reserved phone range (+99 0000000NN) that no real
 * signup can reach, so a demo profile can never collide with a real user.
 */

import { connectMongo, disconnectMongo } from "@/config/mongo.js";
import { AvatarModel } from "@/models/avatar.model.js";
import { InterestModel } from "@/models/interest.model.js";
import { PlanModel } from "@/models/plan.model.js";
import { UserModel } from "@/models/user.model.js";
import { buildAvatars } from "@/seed/avatars.seed.js";
import { buildInterests } from "@/seed/interests.seed.js";
import { buildProfiles } from "@/seed/profiles.seed.js";
import { toGeoJsonPoint } from "@/utils/geo.js";
import { normalizePhone } from "@/utils/phone.js";

const PLANS = [
  { _id: "plan-1m", label: "1 month", priceMinor: 29900, currency: "INR", period: "month", highlighted: false, sortOrder: 0 },
  { _id: "plan-6m", label: "6 months", priceMinor: 149900, currency: "INR", period: "sixMonths", highlighted: true, sortOrder: 1 },
  { _id: "plan-12m", label: "12 months", priceMinor: 249900, currency: "INR", period: "year", highlighted: false, sortOrder: 2 },
] as const;

async function main(): Promise<void> {
  await connectMongo();

  const interests = buildInterests();
  await InterestModel.bulkWrite(
    interests.map((i) => ({ updateOne: { filter: { _id: i._id }, update: { $set: i }, upsert: true } })),
  );

  const avatars = buildAvatars();
  await AvatarModel.bulkWrite(
    avatars.map((a) => ({ updateOne: { filter: { _id: a._id }, update: { $set: a }, upsert: true } })),
  );

  await PlanModel.bulkWrite(
    PLANS.map((p) => ({ updateOne: { filter: { _id: p._id }, update: { $set: p }, upsert: true } })),
  );

  const profiles = buildProfiles();
  await UserModel.bulkWrite(
    profiles.map((p, index) => {
      // Reserved range: +99 is not an assignable country code, so a real
      // signup can never normalise to one of these.
      const phone = normalizePhone("99", String(100000000 + index + 1));

      return {
        updateOne: {
          filter: { "phone.hmac": phone.hmac },
          update: {
            $set: {
              phone,
              name: p.name,
              nameLower: p.name.toLowerCase(),
              birthday: p.birthday,
              gender: p.gender,
              showGender: p.showGender,
              // Derived on save, but bulkWrite bypasses the hook — so it is
              // computed here too rather than silently defaulting.
              publicGenderKind: p.showGender ? p.gender.kind : "preferNotToSay",
              avatarId: p.avatarId,
              bio: p.bio,
              interestIds: p.interestIds,
              location: { point: toGeoJsonPoint(p.coordinate) },
              timezone: "Europe/London",
              lastActiveAt: p.lastActiveAt,
              onboardingComplete: true,
              status: "active",
            },
          },
          upsert: true,
        },
      };
    }),
  );

  const counts = {
    interests: await InterestModel.countDocuments(),
    avatars: await AvatarModel.countDocuments(),
    plans: await PlanModel.countDocuments(),
    users: await UserModel.countDocuments(),
  };

  process.stdout.write(
    `\n  interests ${counts.interests}\n  avatars   ${counts.avatars}\n  plans     ${counts.plans}\n  users     ${counts.users}\n\nseed complete\n`,
  );

  await disconnectMongo();
  process.exit(0);
}

void main();
