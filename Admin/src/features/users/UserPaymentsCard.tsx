/** The account's Razorpay orders, newest first. */

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { formatDateTime, formatInr, humanize } from "@/lib/format";
import type { AdminPayment } from "@/types/admin";

const TONES: Record<AdminPayment["status"], BadgeTone> = {
  created: "warning",
  paid: "success",
  expired: "neutral",
  cancelled: "neutral",
  failed: "danger",
};

export function UserPaymentsCard({ payments }: { payments: AdminPayment[] }) {
  return (
    <Card>
      <CardHeader title="Payments" />
      {payments.length === 0 ? (
        <p className="text-sm text-muted">No payments.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {p.planLabel} · {formatInr(p.amountMinor)}
                </p>
                <p className="text-xs text-muted">
                  {formatDateTime(p.createdAt)}
                  {p.providerPaymentId ? ` · ${p.providerPaymentId}` : ""}
                  {p.grantedUntil ? ` · premium until ${formatDateTime(p.grantedUntil)}` : ""}
                </p>
              </div>
              <Badge tone={TONES[p.status]}>{humanize(p.status)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
