/**
 * Time remaining until an instant, as "4h 12m".
 *
 * Drives the out-of-likes state, which has to say when the quota rolls over
 * (A16) rather than just that it is spent — "come back later" with no "when"
 * is the most annoying possible version of that screen.
 *
 * Recomputed from the target rather than decremented, for the same reason
 * `useCallTimer` is: a counter that subtracts one a minute drifts, and stops
 * entirely while the app is backgrounded.
 */

import { useEffect, useState } from "react";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "now";

  const hours = Math.floor(msRemaining / HOUR);
  const minutes = Math.floor((msRemaining % HOUR) / MINUTE);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "under a minute";
}

export function useCountdown(target: Date | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    // Every 30s: fine for a display that only changes by the minute, and cheap
    // enough to leave running while the screen is up.
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  return formatCountdown(target.getTime() - now);
}
