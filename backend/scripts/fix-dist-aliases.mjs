/**
 * Rewrite `@/…` specifiers in the compiled output to relative paths.
 *
 * WHY. `tsconfig.json` maps `@/*` to `./src/*`, which TypeScript uses to RESOLVE
 * imports and then emits verbatim. tsx and vitest both apply the same mapping at
 * runtime, so 259 `@/…` imports work everywhere except the one place that has no
 * mapping: plain `node dist/server.js`, which is how the server actually runs on
 * a host. It failed on the first import with
 * `ERR_MODULE_NOT_FOUND: Cannot find package '@/app.js'` (PLAN #177).
 *
 * The alternatives were a dependency (`tsc-alias`), rewriting all 259 imports in
 * `src`, or keeping tsx in production. This is the same job as the dependency,
 * in forty lines, and it touches only `dist/` — which is generated, so there is
 * nothing to keep in sync.
 *
 * Runs as `postbuild`. Verified by booting `dist/server.js`, not by reading it.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");

/** Matches the specifier in `from "@/x.js"`, `import("@/x.js")`, `export … from "@/x.js"`. */
const SPECIFIER = /(["'])@\/([^"']+)\1/g;

function* jsFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* jsFiles(full);
    else if (entry.endsWith(".js")) yield full;
  }
}

let files = 0;
let rewrites = 0;

for (const file of jsFiles(DIST)) {
  const before = readFileSync(file, "utf8");
  const after = before.replace(SPECIFIER, (_match, quote, tail) => {
    rewrites += 1;
    // `@/x/y.js` means `dist/x/y.js`; express it relative to the importing file.
    let rel = relative(dirname(file), join(DIST, tail)).split("\\").join("/");
    // A sibling comes back bare ("app.js"), which Node reads as a package name.
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return `${quote}${rel}${quote}`;
  });

  if (after !== before) {
    writeFileSync(file, after);
    files += 1;
  }
}

console.log(`rewrote ${rewrites} alias import(s) across ${files} file(s)`);

// A build that emitted aliases and rewrote none of them is a broken build, not
// a clean one — fail rather than hand over a dist that cannot start.
const left = [...jsFiles(DIST)].filter((file) => SPECIFIER.test(readFileSync(file, "utf8")));
if (left.length > 0) {
  console.error(`aliases remain in:\n${left.map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
