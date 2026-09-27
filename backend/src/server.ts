/**
 * Boot, and shut down without dropping anything.
 *
 * Order on the way up: connect dependencies BEFORE listening. A server that
 * accepts a request before Mongo is up answers it with a 500 it did not need to.
 *
 * Order on the way down: stop accepting new connections, then let in-flight
 * requests finish, then close the databases. A hard exit mid-deploy drops
 * whatever was in flight with no trace, which is the kind of bug nobody can
 * reproduce afterwards.
 */

import type { Server } from "node:http";

import { createApp } from "@/app.js";
import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { connectMongo, disconnectMongo, supportsTransactions } from "@/config/mongo.js";
import { connectRedis, disconnectRedis } from "@/config/redis.js";
import { attachSockets, closeSockets } from "@/sockets/io.js";

const SHUTDOWN_GRACE_MS = 10_000;

async function main(): Promise<void> {
  await connectMongo();
  await connectRedis();

  if (!(await supportsTransactions())) {
    // Not fatal — the server is useful before the phases that need atomicity —
    // but it must be loud, and /ready reports not-ready until it is fixed.
    logger.warn(
      "mongod is a STANDALONE: no multi-document transactions. Accepting a message request cannot be atomic. Convert to a single-node replica set (replSetName: rs0).",
    );
  }

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "listening");
  });

  // Same HTTP server, so sockets and REST share one port, one origin and one
  // TLS terminator — and the token that authenticates a request authenticates
  // a socket.
  await attachSockets(server);
  logger.info("sockets attached");

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");

    const force = setTimeout(() => {
      logger.error("graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    force.unref();

    server.close(async () => {
      // Sockets first: draining them before the databases go means an
      // in-flight message still has somewhere to be written.
      await closeSockets();
      await disconnectMongo();
      await disconnectRedis();
      clearTimeout(force);
      logger.info("shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "unhandled rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception — exiting");
    process.exit(1);
  });
}

void main();
