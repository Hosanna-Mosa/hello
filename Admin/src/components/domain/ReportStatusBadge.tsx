import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { humanize } from "@/lib/format";
import type { ReportStatus } from "@/types/admin";

const TONES: Record<ReportStatus, BadgeTone> = { open: "danger", reviewed: "success" };

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Badge tone={TONES[status]}>{humanize(status)}</Badge>;
}
