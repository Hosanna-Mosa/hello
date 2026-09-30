import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { formatNumber } from "@/lib/format";
import type { DashboardStats } from "@/types/admin";

export function UserBreakdown({ users }: { users: DashboardStats["users"] }) {
  const rows = [
    { label: "Active accounts", value: users.active },
    { label: "Finished onboarding", value: users.onboarded },
    { label: "Premium", value: users.premium },
    { label: "Pending deletion", value: users.pendingDeletion },
    { label: "Erased", value: users.erased },
  ];

  return (
    <Card>
      <CardHeader title="Accounts" description="By state, right now" />
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between py-3 text-sm">
            <span className="text-muted">{r.label}</span>
            <span className="font-semibold text-ink tabular-nums">{formatNumber(r.value)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
