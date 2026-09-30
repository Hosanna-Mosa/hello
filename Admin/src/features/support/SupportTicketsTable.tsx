import { SupportStatusBadge } from "@/components/domain/SupportStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORY_LABEL } from "@/features/support/labels";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AdminSupportTicket } from "@/types/admin";

/** Who spoke last matters in a queue: a ticket ending on a user message is waiting on the team. */
function preview(t: AdminSupportTicket): string {
  if (t.lastMessageAuthor === "admin") return `Support: ${t.lastMessagePreview}`;
  if (t.lastMessageAuthor === "user") return `${t.user.name}: ${t.lastMessagePreview}`;
  return t.lastMessagePreview;
}

const COLUMNS: Column<AdminSupportTicket>[] = [
  {
    key: "ticket",
    header: "Ticket",
    cell: (t) => (
      <span className="flex min-w-0 items-start gap-2">
        <span
          aria-label={t.unreadCount > 0 ? "Unread reply" : undefined}
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", t.unreadCount > 0 ? "bg-primary" : "bg-transparent")}
        />
        <span className="block min-w-0">
          <span className={cn("block truncate text-ink", t.unreadCount > 0 ? "font-bold" : "font-semibold")}>{t.subject}</span>
          <span className="block max-w-md truncate text-xs text-muted">{preview(t)}</span>
        </span>
      </span>
    ),
  },
  {
    key: "user",
    header: "User",
    cell: (t) => (
      <span className="flex items-center gap-2">
        <Avatar name={t.user.name} size="sm" />
        <span className="truncate text-ink">{t.user.name}</span>
      </span>
    ),
  },
  { key: "category", header: "Category", cell: (t) => <span className="text-muted">{CATEGORY_LABEL[t.category]}</span> },
  { key: "status", header: "Status", cell: (t) => <SupportStatusBadge status={t.status} /> },
  {
    key: "activity",
    header: "Last activity",
    cell: (t) => <span className="whitespace-nowrap text-muted">{formatRelative(t.lastMessageAt)}</span>,
  },
];

type Props = { tickets: AdminSupportTicket[]; onOpen: (t: AdminSupportTicket) => void; filtered: boolean };

export function SupportTicketsTable({ tickets, onOpen, filtered }: Props) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={tickets}
      rowKey={(t) => t.id}
      onRowClick={onOpen}
      empty={
        <EmptyState
          icon="message"
          title={filtered ? "No tickets match" : "No support tickets yet"}
          description={filtered ? "Try another status or search." : "When a user opens a ticket in the app, it appears here instantly."}
        />
      }
    />
  );
}
