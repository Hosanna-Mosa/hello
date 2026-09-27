/**
 * Who a viewer must never see.
 *
 * Blocking is SYMMETRIC: blocking someone removes you from their discovery
 * too, not just them from yours. A one-directional implementation means the
 * person you blocked keeps seeing you, which is the opposite of what the
 * button promises.
 *
 * So the hidden set is a UNION of two directions — people this viewer blocked,
 * and people who blocked this viewer — and it is the single place that union
 * is computed. Every discovery, search, likes and requests query already
 * routes through here, which is why filling this in makes blocking take effect
 * everywhere at once rather than in four places that must each remember.
 *
 * Cached in Redis because it is read on every discovery page and changes
 * rarely. The cache is invalidated for BOTH users on any block change — the
 * blocked person's set changes too, and forgetting them is how a block appears
 * to work for a minute and then stop.
 */

import { Types } from "mongoose";

import { key, redis } from "@/config/redis.js";
import { logger } from "@/config/logger.js";
import { BlockModel } from "@/models/block.model.js";
import type { UserDoc } from "@/models/user.model.js";

/** An hour. A block takes effect at once via invalidation, not by expiry. */
const TTL_SECONDS = 3600;

const cacheKey = (userId: string) => key("hidden", `{u:${userId}}`);

/** Read straight from Mongo — the authority the cache stands in for. */
async function computeHidden(userId: Types.ObjectId | string): Promise<string[]> {
  const [blocked, blockedBy] = await Promise.all([
    BlockModel.find({ blockerId: userId }).distinct("blockedUserId"),
    BlockModel.find({ blockedUserId: userId }).distinct("blockerId"),
  ]);

  return [...new Set([...blocked, ...blockedBy].map(String))];
}

export async function hiddenUserIds(viewer: UserDoc): Promise<Types.ObjectId[]> {
  const id = String(viewer._id);
  const k = cacheKey(id);

  try {
    const cached = await redis.get(k);
    if (cached !== null) {
      // The empty set is a real answer and by far the common one, so it is
      // cached too — `""` rather than a missing key, which would mean "ask
      // Mongo again on every page for everyone who has never blocked anyone".
      return (cached === "" ? [] : cached.split(",")).map((s) => new Types.ObjectId(s));
    }
  } catch (err) {
    // A cache that is down must not take safety with it.
    logger.warn({ err }, "hidden-set cache read failed; falling back to mongo");
  }

  const ids = await computeHidden(id);

  try {
    await redis.set(k, ids.join(","), "EX", TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, "hidden-set cache write failed");
  }

  return ids.map((s) => new Types.ObjectId(s));
}

/**
 * Drop the cached set for both sides of a pair.
 *
 * Called on block and unblock. Both, always: a block changes what the blocked
 * person sees just as much as what the blocker sees.
 */
export async function invalidateHidden(...userIds: (Types.ObjectId | string)[]): Promise<void> {
  if (userIds.length === 0) return;

  try {
    await redis.del(...userIds.map((id) => cacheKey(String(id))));
  } catch (err) {
    // Worst case the stale set expires on its own within the hour. Logged
    // rather than thrown: failing the block itself would be far worse.
    logger.warn({ err }, "hidden-set cache invalidation failed");
  }
}

/** Is either side blocking the other? The gate every write-path check uses. */
export async function isBlockedPair(
  a: Types.ObjectId | string,
  b: Types.ObjectId | string,
): Promise<boolean> {
  const found = await BlockModel.exists({
    $or: [
      { blockerId: a, blockedUserId: b },
      { blockerId: b, blockedUserId: a },
    ],
  });

  return found !== null;
}
