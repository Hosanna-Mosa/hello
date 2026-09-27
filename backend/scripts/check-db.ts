/**
 * Connection check for Mongo and Redis.
 *
 * Prints status only. It never prints the connection string, the password or
 * the host — a check that leaks the credential into a terminal, a screenshot or
 * a CI log has traded one problem for a worse one.
 *
 * The transaction probe is the point: an Atlas cluster is a replica set and
 * will pass, a local standalone will fail, and this project needs the former
 * from Phase 4 onwards.
 */

import { env } from "@/config/env.js";
import { connectMongo, disconnectMongo, supportsTransactions, mongoose } from "@/config/mongo.js";
import { connectRedis, disconnectRedis, redis } from "@/config/redis.js";

const ok = (s: string) => `  PASS  ${s}`;
const bad = (s: string) => `  FAIL  ${s}`;
const warn = (s: string) => `  WARN  ${s}`;

async function main(): Promise<void> {
  const results: string[] = [];
  let failed = false;


  try {
    await connectMongo();
    results.push(ok("mongo: connected"));

    const build = await mongoose.connection.db?.admin().command({ buildInfo: 1 });
    results.push(ok(`mongo: server ${(build as { version?: string } | undefined)?.version ?? "unknown"}`));

    const hasTx = await supportsTransactions();

    if (hasTx) {
      results.push(ok("mongo: replica set — transactions available"));

      // Prove one can actually open, not just that the topology claims it.
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await session.abortTransaction();
        results.push(ok("mongo: opened and aborted a real transaction"));
      } catch (e) {
        results.push(bad(`mongo: could not open a transaction — ${(e as Error).message}`));
        failed = true;
      } finally {
        await session.endSession();
      }
    } else if (env.REQUIRE_TRANSACTIONS) {
      results.push(bad("mongo: STANDALONE, but REQUIRE_TRANSACTIONS is on. Connect Atlas or a replica set."));
      failed = true;
    } else {
      results.push(warn("mongo: standalone — no transactions (fine for Phases 1-3, blocks Phase 4)"));
    }
  } catch (e) {
    results.push(bad(`mongo: ${(e as Error).message}`));
    failed = true;
  }

  try {
    await connectRedis();
    const pong = await redis.ping();
    results.push(pong === "PONG" ? ok("redis: connected") : bad(`redis: unexpected ping reply ${pong}`));
    if (pong !== "PONG") failed = true;
  } catch (e) {
    results.push(bad(`redis: ${(e as Error).message}`));
    failed = true;
  }

  const target = env.MONGO_URI.startsWith("mongodb+srv://") ? "Atlas" : "local";
  process.stdout.write(`\n  target: mongo (${target}) db=${env.MONGO_DB}, redis\n${results.join("\n")}\n\n`);

  await disconnectMongo().catch(() => {});
  await disconnectRedis().catch(() => {});
  process.exit(failed ? 1 : 0);
}

void main();
