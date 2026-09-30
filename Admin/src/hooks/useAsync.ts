/**
 * Loads data for a page: `{ data, error, loading, reload }`.
 *
 * Re-runs whenever `deps` change, and ignores a response that arrives after a
 * newer request was started — so typing quickly in a search box can never
 * paint an older result over a newer one.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    const ticket = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (ticket === latest.current) setData(result);
    } catch (e) {
      if (ticket === latest.current) setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
