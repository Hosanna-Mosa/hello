/**
 * The generated wire contract is still a faithful copy.
 *
 * `src/types/contract.generated.d.ts` is a copy of `app/src/services/types.ts`,
 * which exists so that `tsc -p tsconfig.build.json` can compile at all — see
 * `scripts/sync-contract.mjs` for why a copy and not a cross-directory import
 * (PLAN #176).
 *
 * A copy is a second place a wire type can be written, which is exactly what the
 * shared-contract design was built to prevent. This test is what stops that:
 * edit the app's `types.ts` without rebuilding and the suite fails here, naming
 * the command that fixes it. The app's file therefore remains the only place a
 * field is ever defined.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { readSource, render, TARGET } from "../scripts/sync-contract.mjs";

describe("wire contract sync", () => {
  it("the generated declaration file matches the app's types.ts", () => {
    const expected = render(readSource());
    const actual = readFileSync(TARGET, "utf8");

    // Compared as text, not parsed: a comment or a doc block changing is a real
    // divergence too, and the whole point is that the copy is byte-faithful.
    expect(
      actual === expected
        ? "in sync"
        : "STALE — app/src/services/types.ts changed. Run: npm run sync-contract",
    ).toBe("in sync");
  });

  it("refuses to copy a types.ts that has grown runtime code", () => {
    // The copy is only valid while the source is pure type declarations. If
    // someone adds a const or an import, generating a .d.ts would silently drop
    // it, so `render` must throw rather than produce a lying declaration file.
    expect(() => render('export const DEFAULT_RADIUS_KM = 25;\n')).toThrow(/no longer pure types/);
    expect(() => render('import { z } from "zod";\n')).toThrow(/no longer pure types/);
  });

  it("the real types.ts passes that check", () => {
    expect(() => render(readSource())).not.toThrow();
  });
});
