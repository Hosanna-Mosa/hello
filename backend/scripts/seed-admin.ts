/**
 * Creates (or, with --reset, re-keys) one admin panel account.
 *
 *   npm run seed:admin -- --email you@example.com [--password "..."] [--name "..."] [--reset]
 *
 * With no --password a strong one is GENERATED and printed exactly once — it
 * is stored only as a scrypt hash, so it cannot be recovered afterwards, only
 * reset. `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` work in place of the flags.
 *
 * Idempotent: an existing admin is left untouched unless --reset is passed,
 * so running it twice never silently changes someone's password.
 */

import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

import { connectMongo, disconnectMongo } from "@/config/mongo.js";
import { AdminModel } from "@/models/admin.model.js";
import { hashPassword } from "@/utils/password.js";

const MIN_PASSWORD = 12;

function fail(message: string): never {
  process.stderr.write(`\n${message}\n\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      password: { type: "string" },
      name: { type: "string" },
      reset: { type: "boolean", default: false },
    },
  });

  const email = (values.email ?? process.env.ADMIN_SEED_EMAIL ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Pass --email with a valid address.");

  const generated = !(values.password ?? process.env.ADMIN_SEED_PASSWORD);
  const password = values.password ?? process.env.ADMIN_SEED_PASSWORD ?? randomBytes(18).toString("base64url");
  if (password.length < MIN_PASSWORD) fail(`The password must be at least ${MIN_PASSWORD} characters.`);

  await connectMongo();
  await AdminModel.syncIndexes();

  const existing = await AdminModel.findOne({ email });
  if (existing && !values.reset) {
    await disconnectMongo();
    process.stdout.write(`\nAdmin ${email} already exists — unchanged. Pass --reset to set a new password.\n\n`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  await AdminModel.updateOne(
    { email },
    {
      $set: { passwordHash, status: "active", failedAttempts: 0, lockedUntil: null, ...(values.name ? { name: values.name } : {}) },
      $setOnInsert: { email, ...(values.name ? {} : { name: "Admin" }) },
    },
    { upsert: true },
  );

  process.stdout.write(
    `\n  admin     ${email}\n  password  ${generated ? password : "(as provided)"}\n\n${
      generated ? "Store this password now — it is not shown again and cannot be recovered.\n\n" : ""
    }${existing ? "admin password reset\n" : "admin created\n"}`,
  );

  await disconnectMongo();
  process.exit(0);
}

void main();
