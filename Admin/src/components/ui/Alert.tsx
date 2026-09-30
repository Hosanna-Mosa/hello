import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const TONES = {
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-info/30 bg-info-soft text-info",
  success: "border-success/30 bg-success-soft text-success",
} as const;

export function Alert({ tone = "danger", children, action }: { tone?: keyof typeof TONES; children: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-control border p-3 text-sm", TONES[tone])}>
      <Icon name="alert" className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}
