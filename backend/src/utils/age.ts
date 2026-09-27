/**
 * Age, and the 18+ gate.
 *
 * The contract makes this non-negotiable: "The server must reject a birthday
 * under 18 with `validation`, not merely hide the user. The client checks too;
 * neither check replaces the other."
 *
 * Age is computed, never stored. A stored age is wrong the day after it is
 * written, and a filter built on it silently returns the wrong people.
 */

import { ApiError } from "@/errors/ApiError.js";

export const MINIMUM_AGE = 18;

/** Whole years elapsed, in UTC. Mirrors the client's `calculateAge`. */
export function ageFrom(birthday: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - birthday.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthday.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birthday.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Parses an ISO date (`1998-03-14`) and enforces the gate.
 * Rejects a future date too — otherwise a birthday in 2090 reads as a negative
 * age and slips past a naive `>= 18` comparison.
 */
export function parseBirthdayOrThrow(iso: string, now: Date = new Date()): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw ApiError.validation("Birthday must be a date like 1998-03-14.");
  }

  const date = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw ApiError.validation("That isn't a real date.");
  }
  if (date.getTime() > now.getTime()) {
    throw ApiError.validation("That birthday is in the future.");
  }

  if (ageFrom(date, now) < MINIMUM_AGE) {
    throw ApiError.validation("You must be 18 or over to use this app.");
  }

  return date;
}

/** The floor the contract puts under every discovery query. */
export function clampMinAge(requested: number | undefined): number {
  return Math.max(requested ?? MINIMUM_AGE, MINIMUM_AGE);
}
