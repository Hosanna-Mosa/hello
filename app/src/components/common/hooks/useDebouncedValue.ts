/**
 * A value that lags behind, on purpose.
 *
 * Search-as-you-type and the distance slider's live count both fire on every
 * keystroke or frame; debouncing keeps the mock service (300–800ms latency)
 * from queueing a request per character.
 */

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
