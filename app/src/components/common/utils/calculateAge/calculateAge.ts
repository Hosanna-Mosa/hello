/**
 * Whole years, from a birthday.
 *
 * This is load-bearing: the 18+ gate is a hard stop (PLAN §1), so the
 * off-by-one on a birthday that has not happened yet this year matters. A
 * 17-year-old whose birthday is next week must read as 17, not 18.
 *
 * `today` is injectable so the boundary can be tested without mocking the clock.
 */

export const MINIMUM_AGE = 18;

export function calculateAge(birthday: Date | string, today: Date = new Date()): number {
  const born = typeof birthday === "string" ? new Date(birthday) : birthday;

  if (Number.isNaN(born.getTime())) return Number.NaN;

  let age = today.getFullYear() - born.getFullYear();

  const monthDelta = today.getMonth() - born.getMonth();
  const dayDelta = today.getDate() - born.getDate();

  // Birthday has not come round yet this year.
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) age -= 1;

  return age;
}

/** The gate itself, so no screen re-implements the comparison. */
export function isOldEnough(birthday: Date | string, today: Date = new Date()): boolean {
  const age = calculateAge(birthday, today);
  return Number.isFinite(age) && age >= MINIMUM_AGE;
}
