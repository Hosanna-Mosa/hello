/**
 * Proves the seed reproduces the app's mock, field by field.
 *
 * Lives in `tools/` — OUTSIDE the tsconfig `include` — on purpose. It reaches
 * into `app/src/mocks/*`, which are CommonJS modules under the app's own
 * config; pulling them into the backend's strict ESM program breaks
 * `verbatimModuleSyntax` for the whole build. Running it through tsx keeps the
 * check real without weakening the compiler for everything else.
 *
 * Exits non-zero on any mismatch, so `tests/seed.test.ts` can simply assert it
 * ran clean.
 */

import { buildProfiles, ANCHOR } from "../src/seed/profiles.seed.js";
import { haversineMetres } from "../src/utils/geo.js";
import { SEEDED_USERS, MOCK_DISTANCES } from "../../app/src/mocks/profiles.js";

type Row = { id: string; name: string; bio: string; birthday: string; showGender: boolean; avatarId: string; gender: { kind: string } };

const mine = buildProfiles();
const app = SEEDED_USERS as Row[];
const failures: string[] = [];

if (mine.length !== app.length) failures.push(`count ${mine.length} vs ${app.length}`);

for (let i = 0; i < app.length; i++) {
  const a = app[i]!;
  const b = mine[i]!;
  const check = (field: string, x: unknown, y: unknown) => {
    if (x !== y) failures.push(`${a.id} ${field}: app=${String(x)} seed=${String(y)}`);
  };

  check("name", a.name, b.name);
  check("bio", a.bio, b.bio);
  check("gender", a.gender.kind, b.gender.kind);
  check("showGender", a.showGender, b.showGender);
  check("avatarId", a.avatarId, b.avatarId);
  check("birthday", a.birthday, b.birthday.toISOString().slice(0, 10));

  const expected = MOCK_DISTANCES.get(a.id)!;
  const actual = haversineMetres(ANCHOR, b.coordinate);
  if (Math.abs(actual - expected) >= 50) {
    failures.push(`${a.id} distance: app=${Math.round(expected)}m seed=${Math.round(actual)}m`);
  }
}

if (failures.length > 0) {
  process.stdout.write(`seed parity FAILED (${failures.length}):\n${failures.slice(0, 10).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`seed parity OK: ${app.length} profiles identical, distances within 50m\n`);
process.exit(0);
