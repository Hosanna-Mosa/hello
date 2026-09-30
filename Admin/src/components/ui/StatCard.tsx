import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";

type Props = { label: string; value: number; hint?: string; icon: IconName };

export function StatCard({ label, value, hint, icon }: Props) {
  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-ink tabular-nums">{formatNumber(value)}</p>
        {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-hover">
        <Icon name={icon} />
      </span>
    </Card>
  );
}
