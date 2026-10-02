import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Sequential: the suites share one test database, and a parallel run would
    // have them dropping collections underneath each other.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      MONGO_DB: "hello_test",
      REDIS_PREFIX: "hello:test",
      // Fixed here so the review-login suite never depends on a developer's .env.
      // Kept out of the working tree; the voice suite wipes it.
      VOICE_DIR: "./.test-voice",
      REVIEW_LOGIN_EMAIL: "reviewer@example.com",
      REVIEW_LOGIN_PASSWORD: "review-pass-123",
      REVIEW_LOGIN_PHONE: "+447700999001",
      ADMIN_JWT_SECRET: "test-admin-secret-0123456789abcdefghijklmnop",
      // Every suite signs in through `/auth/code` → `devCode`, which only
      // exists in dev mode. Pinned here so a developer's .env — which is
      // pointed at a real deployment and has it off — cannot fail 100+ tests
      // at sign-in (PLAN #231). NODE_ENV is "test", so the production guard
      // in env.ts does not apply.
      OTP_DEV_MODE: "true",
      // ...and the OTP routes are only mounted when this is on (they are off in
      // a real deployment, where the app signs in with a password).
      OTP_LOGIN_ENABLED: "true",
      // Fake Razorpay credentials: the API is stubbed in billing.test, and the
      // webhook secret is what that suite signs its events with.
      RAZORPAY_KEY_ID: "rzp_test_dummykey",
      RAZORPAY_KEY_SECRET: "test-razorpay-key-secret",
      RAZORPAY_WEBHOOK_SECRET: "test-razorpay-webhook-secret",
    },
  },
  resolve: {
    alias: {
      // `@contract` used to live here too, pointing across into the app. It is
      // gone on purpose: the contract now arrives as a generated declaration
      // file under `src/types/`, and a second way to reach the app's types is
      // how the build came to be broken in the first place (PLAN #176).
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
