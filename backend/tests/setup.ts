/**
 * Test harness.
 *
 * Runs against the REAL local Mongo and Redis, in a dedicated database and key
 * prefix. An in-memory Mongo would be more isolated but would also stop testing
 * the thing most likely to break — index behaviour, unique constraints and
 * partial filters are properties of the real server, not of the driver.
 *
 * Everything is torn down between files so one suite cannot leave state that
 * makes another pass for the wrong reason.
 */

import { connectMongo, disconnectMongo, mongoose } from "@/config/mongo.js";
import { connectRedis, disconnectRedis, redis } from "@/config/redis.js";
import { env } from "@/config/env.js";
import { key } from "@/config/redis.js";
import { phoneHmac } from "@/utils/phone.js";

export async function startTestEnv(): Promise<void> {
  await connectMongo();
  await connectRedis();
  await wipe();
}

export async function stopTestEnv(): Promise<void> {
  await wipe();
  await disconnectMongo();
  await disconnectRedis();
}

export async function wipe(): Promise<void> {
  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  }

  // Only this run's keys. A FLUSHDB would take the dev data with it.
  const keys = await redis.keys(`${env.REDIS_PREFIX}:*`);
  if (keys.length > 0) await redis.del(...keys);
}

/**
 * Clears the 30-second resend gate for a number.
 *
 * Needed whenever a test legitimately requests two codes for the same phone —
 * restoring a deleted account, for instance. The alternative is a 30-second
 * sleep in the suite, which is how test runs become something nobody waits for.
 */
export async function clearResendGate(countryCode: string, phoneNumber: string): Promise<void> {
  const hmac = phoneHmac(`+${countryCode}${phoneNumber}`);
  await redis.del(key(`otp:resend:${hmac}`));
}
