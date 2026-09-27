/**
 * A timestamp, as a glance.
 *
 * Used on chat rows, notification groups and "active recently". Deliberately
 * short: these sit at the end of a row where a full date would wrap.
 *
 * `now` is injectable so tests are not clock-dependent.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const elapsed = now - timestamp;

  // Clock skew between a mock service and the device should read as "now",
  // never as a time in the future.
  if (elapsed < MINUTE) return "Now";

  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 2 * DAY) return "Yesterday";
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d`;

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
