import { useEffect, useState } from "react";

import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pendingDeletion", label: "Pending deletion" },
  { value: "erased", label: "Deleted" },
];

const PLAN_OPTIONS = [
  { value: "", label: "All plans" },
  { value: "true", label: "Premium" },
  { value: "false", label: "Free" },
];

type Props = {
  search: string;
  status: string;
  premium: string;
  onChange: (patch: { search?: string; status?: string; premium?: string }) => void;
};

export function UserFilters({ search, status, premium, onChange }: Props) {
  const [draft, setDraft] = useState(search);
  const settled = useDebouncedValue(draft);

  useEffect(() => {
    if (settled !== search) onChange({ search: settled });
    // Only a settled keystroke should push to the URL.
  }, [settled]);

  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
      <div className="flex-1">
        <SearchInput label="Search users" value={draft} onChange={setDraft} placeholder="Search by name, phone or email" />
      </div>
      <div className="sm:w-52">
        <Select aria-label="Filter by status" value={status} options={STATUS_OPTIONS} onChange={(e) => onChange({ status: e.target.value })} />
      </div>
      <div className="sm:w-40">
        <Select aria-label="Filter by plan" value={premium} options={PLAN_OPTIONS} onChange={(e) => onChange({ premium: e.target.value })} />
      </div>
    </div>
  );
}
