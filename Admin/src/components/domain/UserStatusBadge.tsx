import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { humanize } from "@/lib/format";
import type { UserStatus } from "@/types/admin";

const TONES: Record<UserStatus, BadgeTone> = { active: "success", pendingDeletion: "warning", erased: "neutral" };

/** Defined once so every page colours an account state the same way. */
export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={TONES[status]}>{humanize(status)}</Badge>;
}
