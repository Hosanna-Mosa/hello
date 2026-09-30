/**
 * The support counts — open, awaiting the user, resolved, unread — kept live.
 *
 * Refetched (debounced) on every `support:ticket:updated`, rather than
 * recomputed from events: a count derived from a stream of deltas drifts the
 * first time one is missed, and a refetch is one small query.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useSocketEvent } from "@/hooks/useSocketEvent";
import { supportService } from "@/services/admin.service";
import type { SupportSummary } from "@/types/admin";

const DEBOUNCE_MS = 400;

export function useSupportSummary(): SupportSummary | null {
  const [summary, setSummary] = useState<SupportSummary | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    supportService
      .summary()
      .then(setSummary)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  useSocketEvent("support:ticket:updated", () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(refresh, DEBOUNCE_MS);
  });

  return summary;
}
