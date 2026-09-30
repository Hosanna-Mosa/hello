import { Select } from "@/components/ui/Select";
import { humanize } from "@/lib/format";
import { REPORT_REASONS } from "@/types/admin";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
];

const REASON_OPTIONS = [{ value: "", label: "All reasons" }, ...REPORT_REASONS.map((r) => ({ value: r, label: humanize(r) }))];

type Props = { status: string; reason: string; onChange: (patch: { status?: string; reason?: string }) => void };

export function ReportFilters({ status, reason, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
      <div className="sm:w-52">
        <Select aria-label="Filter by status" value={status} options={STATUS_OPTIONS} onChange={(e) => onChange({ status: e.target.value })} />
      </div>
      <div className="sm:w-60">
        <Select aria-label="Filter by reason" value={reason} options={REASON_OPTIONS} onChange={(e) => onChange({ reason: e.target.value })} />
      </div>
    </div>
  );
}
