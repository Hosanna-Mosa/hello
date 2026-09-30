/**
 * Seeds 50 people in Hyderabad (`src/seed/hyderabad.seed.ts`).
 *
 * IDEMPOTENT, like `seed.ts`: upserts keyed on a reserved phone
 * (+99 2000000NN — a different block from the 40 demo profiles' +99 1000000NN),
 * so re-running it updates the same fifty people rather than adding more.
 * Run `npm run seed` first — interests and avatars come from there.
 */

import { connectMongo, disconnectMongo } from "@/config/mongo.js";
import { UserModel } from "@/models/user.model.js";
import { buildHyderabadProfiles } from "@/seed/hyderabad.seed.js";
import { toGeoJsonPoint } from "@/utils/geo.js";
import { normalizePhone } from "@/utils/phone.js";

async function main(): Promise<void> {
  await connectMongo();

  const profiles = buildHyderabadProfiles();
  await UserModel.bulkWrite(
    profiles.map((p, index) => {
      const phone = normalizePhone("99", String(200000000 + index + 1));
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
              // bulkWrite bypasses the save hook that derives this.
              publicGenderKind: p.showGender ? p.gender.kind : "preferNotToSay",
              avatarId: p.avatarId,
              bio: p.bio,
              interestIds: p.interestIds,
              location: { point: toGeoJsonPoint(p.coordinate) },
              timezone: "Asia/Kolkata",
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

  const areas = new Set(profiles.map((p) => p.area));
  const seeded = await UserModel.countDocuments({
    "phone.hmac": { $in: profiles.map((_, i) => normalizePhone("99", String(200000000 + i + 1)).hmac) },
  });

  process.stdout.write(
    `\n  Hyderabad users: ${seeded} across ${areas.size} areas\n` +
      `  users in database: ${await UserModel.countDocuments()}\n\nseed complete\n`,
  );

  await disconnectMongo();
  process.exit(0);
}

void main();
