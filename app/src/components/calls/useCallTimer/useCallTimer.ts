/**
 * Elapsed seconds for a connected call.
 *
 * Counts wall-clock time from a fixed start rather than incrementing a counter
 * once a second. A `setInterval` that adds one drifts, and it stops entirely
 * while the app is backgrounded — come back after two minutes and the call
 * claims it has lasted eight seconds. Reading `Date.now()` against the start is
 * correct through both.
 *
 * The timer only runs while `running` is true, so the ringing state does not
 * quietly accumulate duration before anyone answers.
 */

import { useEffect, useRef, useState } from "react";

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

export function useCallTimer(running: boolean): CallTimer {
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      startedAt.current = null;
      return;
    }

    startedAt.current = Date.now();

    // Ticks faster than once a second so the displayed value never sits a
    // whole second behind the real elapsed time.
    const id = setInterval(() => {
      const start = startedAt.current;
      if (start !== null) setSeconds(Math.floor((Date.now() - start) / 1000));
    }, TICK_MS);

    return () => clearInterval(id);
  }, [running]);

  return { seconds, formatted: formatCallDuration(seconds) };
}
