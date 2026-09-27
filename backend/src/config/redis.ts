/**
 * Redis connections.
 *
 * Three separate clients on purpose. A connection in subscriber mode can issue
 * no other command, so the Socket.IO adapter cannot share the general client,
 * and BullMQ requires `maxRetriesPerRequest: null` which is a bad default for
 * ordinary request-path commands.
 */

import { Redis } from "ioredis";

import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";

function make(role: string, opts: Record<string, unknown> = {}): Redis {
  const client = new Redis(env.REDIS_URL, { lazyConnect: true, ...opts });
  client.on("error", (err) => logger.error({ err, role }, "redis error"));
  return client;
}

/** Request-path commands: quotas, caches, rate limits, OTP, sessions. */
export const redis = make("main");

/** BullMQ demands this setting; it must not be applied to the main client. */
export const redisQueue = make("queue", { maxRetriesPerRequest: null });

export async function connectRedis(): Promise<void> {
  await redis.connect();
  await redis.ping();
  logger.info("redis connected");
}

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
}

/** Every key this server writes is prefixed, so one Redis can host several envs. */
export function key(...parts: (string | number)[]): string {
  return `${env.REDIS_PREFIX}:${parts.join(":")}`;
}
