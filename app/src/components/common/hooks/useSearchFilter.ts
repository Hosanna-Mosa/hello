/**
 * Debounced client-side filtering over a list.
 *
 * Search in this product is people by name only (PLAN Phase 5), but the hook is
 * generic over which fields to read so the settings and interest pickers can
 * reuse it.
 *
 * Case- and accent-insensitive: someone typing "jose" should find "José".
 */

import { useDebouncedValue } from "./useDebouncedValue";

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export type UseSearchFilterOptions<T> = {
  items: readonly T[];
  query: string;
  /** Which strings on each item the query is matched against. */
  fields: (item: T) => readonly (string | undefined)[];
  delayMs?: number;
};

export function useSearchFilter<T>({
  items,
  query,
  fields,
  delayMs = 300,
}: UseSearchFilterOptions<T>) {
  const debouncedQuery = useDebouncedValue(query, delayMs);
  const needle = normalise(debouncedQuery);

  // An empty query is "show everything", not "show nothing".
  const results = needle
    ? items.filter((item) =>
        fields(item).some((field) => field && normalise(field).includes(needle)),
      )
    : items;

  return {
    results,
    /** The query the results actually reflect — lags the input box. */
    appliedQuery: debouncedQuery,
    /** True while the input box is ahead of the results. */
    isSettling: query !== debouncedQuery,
    isEmptyQuery: needle.length === 0,
  };
}
