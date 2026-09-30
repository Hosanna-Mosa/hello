/**
 * List filters kept in the URL, so a filtered page survives a refresh, can be
 * bookmarked, and the back button undoes a filter change.
 */

import { useCallback } from "react";
import { useSearchParams } from "react-router";

export function useSearchParamState<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>;
  const page = Math.max(1, Number(params.get("page")) || 1);

  const set = useCallback(
    (patch: Partial<Record<K | "page", string | number>>) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === "" || v === undefined || (k === "page" && v === 1)) next.delete(k);
          else next.set(k, String(v));
        }
        // Any filter change starts again from the first page.
        if (!("page" in patch)) next.delete("page");
        return next;
      });
    },
    [setParams],
  );

  return { values, page, set };
}
