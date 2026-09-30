import { ReasonBadge } from "@/components/domain/ReasonBadge";
import { ReportStatusBadge } from "@/components/domain/ReportStatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative } from "@/lib/format";
import type { AdminReport } from "@/types/admin";

const COLUMNS: Column<AdminReport>[] = [
  {
    key: "reported",
    header: "Reported user",
    cell: (r) => (
      <span className="block min-w-0">
        <span className="block truncate font-semibold text-ink">{r.reported.name}</span>
        <span className="block truncate text-xs text-muted">by {r.reporter.name}</span>
      </span>
    ),
  },
  { key: "reason", header: "Reason", cell: (r) => <ReasonBadge reason={r.reason} /> },
  { key: "status", header: "Status", cell: (r) => <ReportStatusBadge status={r.status} /> },
  { key: "blocked", header: "Also blocked", cell: (r) => <span className="text-muted">{r.alsoBlocked ? "Yes" : "No"}</span> },
  { key: "filed", header: "Filed", cell: (r) => <span className="text-muted">{formatRelative(r.createdAt)}</span> },
];

export function ReportsTable({ reports, onOpen }: { reports: AdminReport[]; onOpen: (r: AdminReport) => void }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={reports}
      rowKey={(r) => r.id}
      onRowClick={onOpen}
      empty={<EmptyState icon="flag" title="No reports here" description="Nothing matches these filters." />}
    />
  );
}
