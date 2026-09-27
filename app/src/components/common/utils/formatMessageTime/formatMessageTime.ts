/**
 * The two timestamps a conversation needs.
 *
 * A bubble shows a clock time; the separator between two days shows which day.
 * Both are 24-hour and `en-GB`, matching `formatRelativeTime` — mixing 12- and
 * 24-hour clocks inside one screen is a real bug people notice.
 *
 * `now` is injectable so "Today" and "Yesterday" are testable without waiting
 * for midnight.
 */

const DAY = 24 * 60 * 60 * 1000;

/** "09:04", "14:32". */
export function formatClockTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Midnight at the start of the day this instant falls in. */
function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** "Today", "Yesterday", "12 Mar", "12 Mar 2024". */
export function formatDayLabel(timestamp: number, now: number = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** True when two instants fall on different calendar days. */
export function isNewDay(previous: number, current: number): boolean {
  return startOfDay(previous) !== startOfDay(current);
}
