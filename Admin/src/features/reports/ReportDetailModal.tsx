import { useState } from "react";

import { ReasonBadge } from "@/components/domain/ReasonBadge";
import { ReportStatusBadge } from "@/components/domain/ReportStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Modal } from "@/components/ui/Modal";
import { ReportSnapshot } from "@/features/reports/ReportSnapshot";
import { formatDateTime } from "@/lib/format";
import { reportsService } from "@/services/admin.service";
import type { AdminReport } from "@/types/admin";

type Props = { report: AdminReport | null; onClose: () => void; onUpdated: (r: AdminReport) => void };

export function ReportDetailModal({ report, onClose, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!report) return <Modal open={false} title="" onClose={onClose}>{null}</Modal>;

  const next = report.status === "open" ? "reviewed" : "open";

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await reportsService.setStatus(report.id, next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Report"
      onClose={onClose}
      footer={
        <>
          <ButtonLink to={`/users/${report.reported.id}`}>View reported user</ButtonLink>
          <Button variant={next === "reviewed" ? "primary" : "secondary"} loading={busy} onClick={toggle}>
            {next === "reviewed" ? "Mark reviewed" : "Reopen"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap gap-2">
          <ReasonBadge reason={report.reason} />
          <ReportStatusBadge status={report.status} />
        </div>
        <DescriptionList
          items={[
            { label: "Reported user", value: report.reported.name },
            { label: "Reported by", value: report.reporter.name },
            { label: "Filed", value: formatDateTime(report.createdAt) },
            { label: "Also blocked", value: report.alsoBlocked ? "Yes" : "No" },
            { label: "Details", value: report.details || "—" },
          ]}
        />
        <ReportSnapshot report={report} />
      </div>
    </Modal>
  );
}
