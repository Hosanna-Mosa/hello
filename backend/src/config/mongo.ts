/**
 * Mongo connection.
 *
 * `autoIndex` is OFF everywhere. Indexes are applied deliberately by
 * `scripts/migrate.ts`, never built implicitly by a process that happens to
 * boot first — an index build under load on a collection that matters is a
 * self-inflicted outage.
 *
 * This project needs a REPLICA SET even for a single node, because accepting a
 * message request writes a match, a thread, a seed message and a status flip
 * that must all land together. A standalone mongod cannot do that.
 */

import mongoose from "mongoose";

import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";

mongoose.set("strictQuery", true);
mongoose.set("autoIndex", false);
/**
 * `sanitizeFilter` is deliberately OFF.
 *
 * It defends against query injection by escaping `$` operators — but it cannot
 * tell a server-built operator from a user-supplied one, so it also breaks
 * legitimate queries: `{ fromUserId: { $nin: [...] } }` is cast as a literal
 * and fails with "Cast to ObjectId failed for value { '$nin': [] }".
 *
 * Injection is prevented at the edge instead, which is where it belongs: every
 * request body and query string is parsed by a zod schema before it reaches a
 * service, and `z.string()` cannot yield `{ $gt: "" }`. Ids are additionally
 * checked with `Types.ObjectId.isValid` and the search term is regex-escaped.
 *
 * The rule that keeps this true: NO UNVALIDATED INPUT REACHES A FILTER.
 */

export async function connectMongo(): Promise<typeof mongoose> {
  mongoose.connection.on("connected", () => logger.info("mongo connected"));
  mongoose.connection.on("disconnected", () => logger.warn("mongo disconnected"));
  mongoose.connection.on("error", (err) => logger.error({ err }, "mongo error"));

  await mongoose.connect(env.MONGO_URI, {
    dbName: env.MONGO_DB,
    serverSelectionTimeoutMS: 5_000,
  });

  return mongoose;
}

/**
 * True when the server can open a transaction. Checked at boot and surfaced on
 * /ready, because the alternative is discovering it on the first accepted
 * message request in a demo.
 */
export async function supportsTransactions(): Promise<boolean> {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    const info = (await admin.command({ hello: 1 })) as { setName?: string; msg?: string };
    return Boolean(info.setName) || info.msg === "isdbgrid";
  } catch {
    return false;
  }
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.connection.close(false);
}

export { mongoose };
