/**
 * The queue's filters: status tabs (with live counts) and a search box.
 * Both live in the URL (see `useSearchParamState`), so a filtered queue
 * survives a refresh and can be shared.
 */

import { useEffect, useState } from "react";

import { SearchInput } from "@/components/ui/SearchInput";
import { STATUS_LABEL } from "@/features/support/labels";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/cn";
import type { SupportSummary, SupportTicketStatus } from "@/types/admin";

const TABS: { value: SupportTicketStatus | ""; label: string; count: (s: SupportSummary) => number }[] = [
  { value: "", label: "All", count: (s) => s.open + s.pendingResolution + s.resolved },
  { value: "open", label: STATUS_LABEL.open, count: (s) => s.open },
  { value: "pendingResolution", label: STATUS_LABEL.pendingResolution, count: (s) => s.pendingResolution },
  { value: "resolved", label: STATUS_LABEL.resolved, count: (s) => s.resolved },
];

type Props = {
  status: string;
  search: string;
  summary: SupportSummary | null;
  onChange: (patch: { status?: string; search?: string }) => void;
};

export function SupportFilters({ status, search, summary, onChange }: Props) {
  const [draft, setDraft] = useState(search);
  const settled = useDebouncedValue(draft);

  useEffect(() => {
    if (settled !== search) onChange({ search: settled });
    // Only a settled keystroke should push to the URL.
  }, [settled]);

  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
      <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-control bg-sunken p-1">
        {TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange({ status: tab.value })}
              className={cn(
                "flex items-center gap-2 rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {tab.label}
              {summary && <span className="text-xs text-faint tabular-nums">{tab.count(summary)}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex-1 lg:max-w-sm lg:ml-auto">
        <SearchInput label="Search tickets" value={draft} onChange={setDraft} placeholder="Search by subject or user name" />
      </div>
    </div>
  );
}
