/** Who raised the ticket, what it is, where it stands — and the Resolve action. */

import { Link } from "react-router";

import { SupportStatusBadge } from "@/components/domain/SupportStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { CATEGORY_LABEL } from "@/features/support/labels";
import { ResolvePanel } from "@/features/support/ResolvePanel";
import { formatDateTime, humanize } from "@/lib/format";
import type { AdminSupportTicket } from "@/types/admin";

type Props = { ticket: AdminSupportTicket; onResolve: () => Promise<void> };

export function TicketSidePanel({ ticket, onResolve }: Props) {
  const erased = ticket.user.status === "erased";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Raised by" />
        <div className="flex items-center gap-3">
          <Avatar name={ticket.user.name} />
          <div className="min-w-0">
            {erased ? (
              <p className="font-semibold text-ink">{ticket.user.name}</p>
            ) : (
              <Link to={`/users/${ticket.user.id}`} className="font-semibold text-ink hover:text-primary-hover hover:underline">
                {ticket.user.name}
              </Link>
            )}
            <p className="text-xs text-muted">Account {humanize(ticket.user.status).toLowerCase()}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Ticket" />
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Status</dt>
            <dd>
              <SupportStatusBadge status={ticket.status} />
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Category</dt>
            <dd className="text-right text-ink">{CATEGORY_LABEL[ticket.category]}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Opened</dt>
            <dd className="text-right text-ink">{formatDateTime(ticket.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Last activity</dt>
            <dd className="text-right text-ink">{formatDateTime(ticket.lastMessageAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Resolution" />
        <ResolvePanel ticket={ticket} onResolve={onResolve} />
      </Card>
    </div>
  );
}
