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
