/**
 * Copy the app's wire contract into the backend as a DECLARATION file.
 *
 * WHY THIS EXISTS. `docs/api-contract.md` names `app/src/services/types.ts` the
 * source of truth, and `src/types/wire.ts` re-exports from it so that renaming a
 * field breaks both builds at once. That worked for `tsc --noEmit` and for tsx,
 * and only for them: the moment `tsconfig.build.json` sets `rootDir: ./src`,
 * TypeScript refuses a `.ts` input from outside it — TS6059. So `npm run build`
 * had never once succeeded, and `npm start` (`node dist/server.js`) had no dist
 * to start. Nothing caught it, because `dev` uses tsx and `typecheck` has no
 * rootDir (PLAN #176).
 *
 * A `.d.ts` is exempt: it produces no output, so rootDir has nothing to place.
 * Hence a copy, generated, living under `src/`.
 *
 * THE SINGLE SOURCE SURVIVES. `prebuild` regenerates before every build and
 * `tests/contract-sync.test.ts` fails when the copy is stale, so the app's file
 * is still the only place a wire type is written. Editing the generated file is
 * pointless — the next build overwrites it.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const SOURCE = resolve(here, "../../app/src/services/types.ts");
export const TARGET = resolve(here, "../src/types/contract.generated.d.ts");

/**
 * Runtime constructs, which a `.d.ts` cannot carry.
 *
 * The copy is only valid because the source is 35 type declarations and no
 * imports. If that ever stops being true this must fail loudly rather than
 * generate a declaration file that silently drops code.
 */
const RUNTIME = [
  /^import\s/,
  /^export\s+(const|let|var|function|class|default|enum|\*)/,
  /^(const|let|var|function|class|enum)\s/,
  /^export\s*\{(?!\s*type\s)/,
];

/** Build the declaration file's text. Pure, so the test can compare without writing. */
export function render(source) {
  const offenders = source
    .split("\n")
    .map((line, index) => [index + 1, line])
    .filter(([, line]) => RUNTIME.some((pattern) => pattern.test(line)));

  if (offenders.length > 0) {
    const where = offenders.map(([line, text]) => `  ${line}: ${text.trim()}`).join("\n");
    throw new Error(
      `app/src/services/types.ts is no longer pure types, so it cannot be copied\n` +
        `into a .d.ts. Offending lines:\n${where}\n\n` +
        `Move the runtime code out of types.ts, or give the backend its own import.`,
    );
  }

  const digest = createHash("sha256").update(source).digest("hex").slice(0, 16);

  return (
    `// GENERATED FILE — DO NOT EDIT.\n` +
    `//\n` +
    `// Copied verbatim from app/src/services/types.ts by scripts/sync-contract.mjs.\n` +
    `// Edit that file; run \`npm run sync-contract\` (or any build) to refresh this one.\n` +
    `// source-sha256: ${digest}\n` +
    `\n` +
    source
  );
}

export function readSource() {
  return readFileSync(SOURCE, "utf8");
}

// Only write when run as a script, so the test can import `render` freely.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const text = render(readSource());
  let existing = null;
  try {
    existing = readFileSync(TARGET, "utf8");
  } catch {
    // First run.
  }
  if (existing === text) {
    console.log("contract already in sync");
  } else {
    writeFileSync(TARGET, text);
    console.log(`wrote ${TARGET}`);
  }
}
