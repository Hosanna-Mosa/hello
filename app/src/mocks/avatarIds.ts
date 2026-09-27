/**
 * The thirty preset avatar ids, in order.
 *
 * SEPARATE FROM `avatars.ts` ON PURPOSE. That module `require()`s a PNG per
 * row, which only Metro can resolve — so anything importing it is unusable
 * under plain Node. The backend's seed-parity tool runs `mocks/profiles.ts`
 * exactly that way to prove its forty people match the app's, and adding the
 * artwork broke it (PLAN #138).
 *
 * So the ids live here, where nothing is required, and `profiles.ts` takes
 * only what it actually needs. `avatars.test.ts` asserts the two agree.
 */

export const AVATAR_IDS: readonly string[] = Array.from(
  { length: 30 },
  (_, index) => `avatar-${String(index + 1).padStart(2, "0")}`,
);
