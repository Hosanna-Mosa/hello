import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const TONES: Record<string, { box: string; icon: IconName }> = {
  danger: { box: "border-danger/30 bg-danger-soft text-danger", icon: "alert" },
  info: { box: "border-info/30 bg-info-soft text-info", icon: "help" },
  success: { box: "border-success/30 bg-success-soft text-success", icon: "check" },
  warning: { box: "border-warning/30 bg-warning-soft text-warning", icon: "alert" },
};

type Props = { tone?: "danger" | "info" | "success" | "warning"; title?: string; children: ReactNode };

export function Alert({ tone = "info", title, children }: Props) {
  const t = TONES[tone] ?? TONES.info!;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-control border p-4 text-sm", t.box)}>
      <Icon name={t.icon} className="mt-0.5 shrink-0" size={18} />
      <div className="flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  );
}
