/**
 * Elapsed seconds for a connected call.
 *
 * Counts wall-clock time from `connectedAt` rather than incrementing a counter
 * once a second. A `setInterval` that adds one drifts, and it stops entirely
 * while the app is backgrounded — come back after two minutes and the call
 * claims it has lasted eight seconds. Reading `Date.now()` against the start is
 * correct through both.
 *
 * The start comes from the call, not from this hook: the call outlives the
 * screen now, so leaving and returning must show the real duration, not a
 * timer that restarted at 0:00 on remount.
 */

import { useEffect, useState } from "react";

const TICK_MS = 500;

export type CallTimer = {
  seconds: number;
  /** "0:07", "12:03" — the same format the system message uses. */
  formatted: string;
};

export function formatCallDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** `connectedAt` is `Date.now()` at connection, or null while not connected. */
export function useCallTimer(connectedAt: number | null): CallTimer {
  // The clock ticks; the duration is derived from it, never accumulated.
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (connectedAt === null) return;

    // Ticks faster than once a second so the displayed value never sits a
    // whole second behind the real elapsed time.
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [connectedAt]);

  const seconds = connectedAt === null ? 0 : Math.max(0, Math.floor((now - connectedAt) / 1000));
  return { seconds, formatted: formatCallDuration(seconds) };
}
