/**
 * Environment, validated once at boot.
 *
 * The rule this file exists to enforce: a missing `JWT_ACCESS_SECRET` must
 * REFUSE TO START, not start a server that happily signs tokens with
 * `undefined`. Every failure here is fatal and prints every problem at once,
 * because finding them one restart at a time is how an afternoon disappears.
 *
 * Secrets have no defaults. Anything with a default is a tuning knob, not a
 * secret — if it can safely default, it is not a secret.
 */

import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ quiet: true });

const secret = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .min(32, `${name} must be at least 32 characters — generate one, do not invent one`);

/**
 * Where voice audio goes when `VOICE_DIR` is not set.
 *
 * Under systemd, `StateDirectory=hello` exports `STATE_DIRECTORY` — the ONE
 * writable place `ProtectSystem=strict` leaves. Defaulting to it means a
 * forgotten `VOICE_DIR` line in `.env` no longer makes every upload fail with
 * EROFS on a read-only checkout. Off systemd (dev, tests) it is `./data/voice`.
 */
function defaultVoiceDir(): string {
  const state = process.env.STATE_DIRECTORY?.split(":")[0]?.trim();
  return state ? `${state.replace(/\/+$/, "")}/voice` : "./data/voice";
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  MONGO_DB: z.string().min(1).default("hello"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  REDIS_PREFIX: z.string().min(1).default("hello:dev"),

  JWT_ACCESS_SECRET: secret("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: secret("JWT_REFRESH_SECRET"),
  ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_SEC: z.coerce.number().int().positive().default(2_592_000),

  /** Peppers the phone HMAC, so a dump of `users` is not a list of phone numbers. */
  PHONE_PEPPER: secret("PHONE_PEPPER"),
  /** Signs pagination cursors, so a cursor cannot be forged or replayed. */
  CURSOR_SECRET: secret("CURSOR_SECRET"),

  /**
   * Returns the OTP in the response instead of sending an SMS. Must never be
   * true in production — asserted below, not merely documented.
   */
  OTP_DEV_MODE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  /**
   * Sends no SMS and prints the code to the SERVER LOG — without returning it
   * in the response.
   *
   * This is the mode a deployed test server runs in. `OTP_DEV_MODE` cannot be:
   * it echoes the code to whoever asked, so on a public host anyone could sign
   * in as any phone number, and `env.ts` refuses to boot with it in production
   * for exactly that reason. But a server with no SMS provider and no log-only
   * mode cannot log ANYONE in — `smsSender` throws on the first request — which
   * would make the deploy useless until Twilio is wired.
   *
   * So this splits the two things `OTP_DEV_MODE` was doing. Reading the code
   * still needs shell access to the host, which is the property that makes it
   * acceptable in production; echoing it to the caller never is.
   *
   * It is a stopgap with a real cost: anyone who can read the logs can sign in
   * as anybody. Wire a provider in `sms.service.ts` before this is a product.
   */
  OTP_LOG_ONLY: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /**
   * The store-review sign-in: one email + password that opens a session on one
   * EXISTING phone account, so a Play reviewer can get in without receiving an
   * SMS.
   *
   * Server-side on purpose. Shipped in the app, the password would be one
   * `unzip` of the APK away, and the account it opens is a real person's.
   * All three unset → the endpoint refuses every attempt. `REVIEW_LOGIN_PHONE`
   * is E.164 (`+919704726252`) and must already be registered — this never
   * creates an account.
   */
  REVIEW_LOGIN_EMAIL: z.string().email().optional(),
  REVIEW_LOGIN_PASSWORD: z.string().min(8).optional(),
  REVIEW_LOGIN_PHONE: z
    .string()
    .regex(/^\+\d{7,19}$/, "REVIEW_LOGIN_PHONE must be E.164, e.g. +919704726252")
    .optional(),
  OTP_TTL_SEC: z.coerce.number().int().positive().default(300),
  OTP_RESEND_SEC: z.coerce.number().int().positive().default(30),

  /**
   * Whether the server refuses to report ready without multi-document
   * transactions.
   *
   * Phases 1-3 (auth, profile, taxonomy, discovery) write one document at a
   * time and run fine on a standalone mongod. From Phase 4 this stops being
   * true: accepting a message request writes a match, a thread, a seed message
   * and a status flip, and a partial write there is a corrupt account state
   * nobody would notice until a demo.
   *
   * Default false so local work is not blocked; forced true in production, and
   * flipped to true here the day Phase 4 starts.
   */
  REQUIRE_TRANSACTIONS: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  /**
   * Where the seeded demo people live.
   *
   * Defaults to London, which is where the app's mock data has always been
   * anchored. It has to be overridable: a tester in Hyderabad is 7,700 km from
   * London, the discovery radius caps at 100 km, and the deck is then correctly
   * but uselessly empty. Point this at wherever the demo is happening and
   * re-run `npm run seed`.
   */
  SEED_ANCHOR_LAT: z.coerce.number().min(-90).max(90).default(51.5074),
  SEED_ANCHOR_LNG: z.coerce.number().min(-180).max(180).default(-0.1278),

  /**
   * Where voice messages are written. One folder per thread, so ending a
   * conversation can remove its audio in one step. Must be writable by the
   * service user — in production that is `/var/lib/hello/voice`, which the
   * systemd unit's `StateDirectory=hello` creates, and the default when unset.
   * Checked for writability at boot (`checkVoiceStorage`).
   */
  VOICE_DIR: z.string().min(1).default(defaultVoiceDir()),
  /** 2 minutes of AAC at ~64 kbps is ~1 MB; the cap leaves headroom. */
  VOICE_MAX_BYTES: z.coerce.number().int().positive().default(2_000_000),
  VOICE_MAX_SEC: z.coerce.number().int().positive().default(120),

  FREE_DAILY_LIKES: z.coerce.number().int().positive().default(15),
  CORS_ORIGINS: z.string().default("*"),
  /**
   * ICE servers for voice calls.
   *
   * STUN is free and public by default. TURN is optional so the feature is
   * developable with no infrastructure — but see `ice.service.ts`: without it,
   * a caller behind a carrier NAT simply never connects.
   */
  STUN_URLS: z.string().default("stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"),
  TURN_URLS: z.string().optional(),
  TURN_SECRET: z.string().optional(),
  /** Short. A credential only has to outlive the setup of one call. */
  TURN_TTL_SEC: z.coerce.number().int().positive().default(600),

  /**
   * The admin panel's own signing secret — deliberately NOT the app's
   * `JWT_ACCESS_SECRET`, so an app token can never be replayed as an admin
   * one. Optional so an API with no panel still boots; unset, every admin
   * route refuses (see `middlewares/adminAuth.ts`).
   */
  ADMIN_JWT_SECRET: secret("ADMIN_JWT_SECRET").optional(),
  /** Hard cap on one admin sign-in. Not sliding: a stolen cookie dies on time. */
  ADMIN_SESSION_TTL_SEC: z.coerce.number().int().positive().default(28_800),
  /**
   * Origins the admin panel is served from. Admin routes answer CORS with
   * credentials ONLY for these — never the app's `CORS_ORIGINS`, and never `*`.
   * Unset → same-origin only (the panel behind the same host, or Vite's proxy).
   */
  ADMIN_ORIGINS: z.string().optional(),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  /**
   * The one-line-per-request log (middlewares/requestLog.ts). Unset → on in
   * development, off in production. `true` / `false` forces it either way.
   */
  REQUEST_LOG: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    // Not the logger: the logger's own level comes from the env we just failed
    // to read, so this has to be plain stderr.
    process.stderr.write(`\nInvalid environment. Refusing to start.\n${lines.join("\n")}\n\n`);
    process.exit(1);
  }

  const env = parsed.data;

  if (env.NODE_ENV === "production" && env.OTP_DEV_MODE) {
    process.stderr.write(
      "\nOTP_DEV_MODE is true in production. That returns every login code in the HTTP response.\nRefusing to start.\n\n",
    );
    process.exit(1);
  }

  if (env.NODE_ENV === "production" && !env.REQUIRE_TRANSACTIONS) {
    process.stderr.write(
      "\nREQUIRE_TRANSACTIONS must be true in production. A standalone mongod cannot write a match and its thread atomically.\nRefusing to start.\n\n",
    );
    process.exit(1);
  }

  // Not a refusal: the day a provider is wired, `OTP_LOG_ONLY` goes false and
  // this must not block the boot. But a production server that can log nobody
  // in should say so at startup rather than at someone's first sign-in.
  if (env.NODE_ENV === "production" && !env.OTP_LOG_ONLY) {
    process.stderr.write(
      "\nOTP_LOG_ONLY is false and no SMS provider is wired in sms.service.ts.\nEvery sign-in will fail. Set OTP_LOG_ONLY=true for a test deploy, or wire a provider.\n\n",
    );
  }

  if (env.NODE_ENV === "production" && env.CORS_ORIGINS === "*") {
    process.stderr.write("\nCORS_ORIGINS is '*' in production. Refusing to start.\n\n");
    process.exit(1);
  }

  return env;
}

export const env = load();

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const adminOrigins = (env.ADMIN_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s && s !== "*");
export const corsOrigins = env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(",").map((s) => s.trim());
