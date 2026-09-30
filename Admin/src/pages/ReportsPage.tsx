import { useState } from "react";

import { AsyncContent } from "@/components/ui/AsyncContent";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ReportDetailModal } from "@/features/reports/ReportDetailModal";
import { ReportFilters } from "@/features/reports/ReportFilters";
import { ReportsTable } from "@/features/reports/ReportsTable";
import { useAsync } from "@/hooks/useAsync";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParamState } from "@/hooks/useSearchParamState";
import { reportsService } from "@/services/admin.service";
import type { AdminReport, ReportStatus } from "@/types/admin";

const KEYS = ["status", "reason"] as const;

export default function ReportsPage() {
  usePageTitle("Reports");
  const { values, page, set } = useSearchParamState(KEYS);
  const [open, setOpen] = useState<AdminReport | null>(null);
  const status = values.status as ReportStatus | "";

  const { data, error, loading, reload, setData } = useAsync(
    () => reportsService.list({ page, status, reason: values.reason }),
    [page, status, values.reason],
  );

  const updated = (r: AdminReport) => {
    setOpen(r);
    setData((prev) => (prev ? { ...prev, items: prev.items.map((x) => (x.id === r.id ? r : x)) } : prev));
  };

  return (
    <>
      <PageHeader title="Reports" description="Reports filed by users. Open one to review the evidence." />
      <Card padded={false} className="overflow-hidden">
        <ReportFilters status={values.status} reason={values.reason} onChange={set} />
        <AsyncContent data={data} loading={loading} error={error} onRetry={reload}>
          {(result) => (
            <>
              <ReportsTable reports={result.items} onOpen={setOpen} />
              {result.total > 0 && (
                <Pagination page={result.page} pages={result.pages} total={result.total} limit={result.limit} onChange={(p) => set({ page: p })} />
              )}
            </>
          )}
        </AsyncContent>
      </Card>
      <ReportDetailModal report={open} onClose={() => setOpen(null)} onUpdated={updated} />
    </>
  );
}
