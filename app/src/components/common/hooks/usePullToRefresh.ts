/**
 * Pull-to-refresh, with the spinner guaranteed to stop.
 *
 * Wraps the refresh call in try/finally: a rejected refresh that leaves
 * `refreshing` true gives a list that spins forever, which looks like a hang
 * rather than a failure.
 */

import { useState } from "react";

export function usePullToRefresh(onRefreshRequested: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    // Ignore a second pull while one is already in flight.
    if (refreshing) return;

    setRefreshing(true);
    try {
      await onRefreshRequested();
    } finally {
      setRefreshing(false);
    }
  }

  return { refreshing, onRefresh };
}
