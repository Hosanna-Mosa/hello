/// <reference types="node" />
//
// Referenced per-file on purpose. `tsconfig.types` is pinned to ["jest"]
// (PLAN #8), and widening it would put `process`, `Buffer` and friends in
// scope for every app file — in a React Native project, where reaching for
// one is usually the mistake. This is the only file that reads the disk.

/**
 * Conventions a reviewer would have to remember, enforced instead.
 *
 * These read the source as text rather than importing it, because what they
 * check is a property of the FILES — that a mistake is absent everywhere —
 * which no amount of rendering can establish.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = join(__dirname, "..");

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "__snapshots__") continue;
      filesUnder(path, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

describe("the signed-in user's id is asked for, never assumed", () => {
  /**
   * `"me"` is the MOCK's id for the signed-in user. Against the real API it is
   * a Mongo id, so a comparison against the literal silently matches nobody —
   * and `.find(x => x !== "me")` then returns the FIRST element rather than
   * none, which is the dangerous part: no error, just the wrong person.
   *
   * That shipped. Both people in a conversation saw the same name in the
   * header, every message rendered as incoming on both phones, and a voice
   * call showed you your own name (PLAN #108, #109). It was found on two
   * physical devices, which is the expensive way to find it.
   *
   * Services may hold the literal: each one branches on `isMockMode()` and the
   * mock side is entitled to its own id. Screens may not — they run in both
   * modes with no branch, so `currentUserIdOrMe()` is the only correct source.
   */
  const COMPARISON = /[!=]==\s*"me"|"me"\s*[!=]==|=\s*"me"\s*;/;

  it("no screen compares an id against the literal \"me\"", () => {
    const offenders = filesUnder(join(SRC, "app"))
      .filter((path) => COMPARISON.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(SRC.length + 1));

    expect(offenders).toEqual([]);
  });

  it("every screen that resolves a partner does it through currentUserIdOrMe", () => {
    // "The participant who is not me" is the exact shape that failed. Wherever
    // a screen still writes it, the value it excludes must come from the
    // client rather than a constant.
    const offenders = filesUnder(join(SRC, "app"))
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        if (!/participantIds\.find|userIds\.find/.test(source)) return false;
        return !source.includes("currentUserIdOrMe");
      })
      .map((path) => path.slice(SRC.length + 1));

    expect(offenders).toEqual([]);
  });
});

describe("services keep both transports", () => {
  /**
   * A service method that reads module state without an `isMockMode()` branch
   * works in the mock and silently returns nothing against the real API. That
   * is how `getMatchForThread` came to report every live conversation as
   * ended, taking the composer away (PLAN #108).
   *
   * Checked per FILE, not per method: a service whose every read is mocked is
   * a deliberate mock (`replies`), while one that speaks HTTP for some calls
   * and not others is the failure mode.
   */
  it("no service mixes http with an unbranched module-state read", () => {
    const services = filesUnder(join(SRC, "services")).filter((p) => p.endsWith(".service.ts"));
    expect(services.length).toBeGreaterThan(0);

    const offenders = services.filter((path) => {
      const source = readFileSync(path, "utf8");
      if (!source.includes("http<")) return false;
      // Every exported async method in a dual-transport service must decide
      // which transport it is on.
      const methods = source.match(/^ {2}async \w+\([^)]*\)[^{]*\{/gm) ?? [];
      const branches = source.match(/isMockMode\(\)/g) ?? [];
      // `getMatchWithUser` and friends delegate to another method that
      // branches, so the count is a floor, not an equality.
      return branches.length === 0 && methods.length > 0;
    });

    expect(offenders).toEqual([]);
  });
});
