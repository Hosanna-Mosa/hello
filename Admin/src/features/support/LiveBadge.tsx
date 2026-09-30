/** "Live" / "Reconnecting…" — so an operator knows whether the queue is updating by itself. */

import { useSocketStatus } from "@/hooks/useSocketStatus";
import { cn } from "@/lib/cn";

const TEXT = { live: "Live", connecting: "Reconnecting…", offline: "Offline — refresh to update" } as const;

export function LiveBadge() {
  const status = useSocketStatus();
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        status === "live" ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
      )}
    >
      <span className={cn("size-2 rounded-full", status === "live" ? "animate-pulse bg-success" : "bg-warning")} />
      {TEXT[status]}
    </span>
  );
}
