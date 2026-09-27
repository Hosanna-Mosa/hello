/**
 * Runs a unit of work atomically when the deployment can, and loudly
 * sequentially when it cannot.
 *
 * Accepting a message request writes four things — a match, a thread, a seed
 * message and a status flip — and a partial write there is a corrupt account
 * state that nothing surfaces: a match pointing at a thread that does not
 * exist, or a request stuck `pending` after its match was created.
 *
 * Atlas gives a replica set, so transactions are available and this is a real
 * transaction. A LOCAL STANDALONE cannot do them at all, and refusing to run
 * would make the whole feature undevelopable before the cluster is wired up.
 * So the fallback runs the same callback without a session.
 *
 * The fallback is safe to have because it cannot reach production:
 * `env.ts` REFUSES TO BOOT when `NODE_ENV=production` and
 * `REQUIRE_TRANSACTIONS` is not true, and with the flag on this throws rather
 * than degrading. The escape hatch is bounded by a startup assertion, not by
 * anyone remembering.
 */

import type { ClientSession } from "mongoose";

import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { mongoose, supportsTransactions } from "@/config/mongo.js";
import { ApiError } from "@/errors/ApiError.js";

let availability: boolean | null = null;
let warned = false;

async function transactionsAvailable(): Promise<boolean> {
  availability ??= await supportsTransactions();
  return availability;
}

/** Test seam — the harness flips topologies between suites. */
export function resetTransactionSupportCache(): void {
  availability = null;
}

export async function withTransaction<T>(work: (session: ClientSession | undefined) => Promise<T>): Promise<T> {
  if (await transactionsAvailable()) {
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  if (env.REQUIRE_TRANSACTIONS) {
    throw ApiError.server("This server requires a replica set and is not connected to one.");
  }

  if (!warned) {
    warned = true;
    logger.warn(
      "Running multi-document writes WITHOUT a transaction: this mongod is a standalone. Safe for local development only — production refuses to boot in this state.",
    );
  }

  return work(undefined);
}
