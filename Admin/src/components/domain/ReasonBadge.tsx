import { Badge } from "@/components/ui/Badge";
import { humanize } from "@/lib/format";

const SEVERE = new Set(["underage", "harassment"]);

export function ReasonBadge({ reason }: { reason: string }) {
  return <Badge tone={SEVERE.has(reason) ? "danger" : "primary"}>{humanize(reason)}</Badge>;
}
