import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { STATUS_LABEL } from "@/features/support/labels";
import type { SupportTicketStatus } from "@/types/admin";

const TONES: Record<SupportTicketStatus, BadgeTone> = { open: "info", pendingResolution: "warning", resolved: "success" };

export function SupportStatusBadge({ status }: { status: SupportTicketStatus }) {
  return <Badge tone={TONES[status]}>{STATUS_LABEL[status]}</Badge>;
}
