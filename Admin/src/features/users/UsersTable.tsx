import { useNavigate } from "react-router";

import { UserStatusBadge } from "@/components/domain/UserStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatRelative } from "@/lib/format";
import type { AdminUser } from "@/types/admin";

const COLUMNS: Column<AdminUser>[] = [
  {
    key: "user",
    header: "User",
    cell: (u) => (
      <span className="flex items-center gap-3">
        <Avatar name={u.name || "?"} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{u.name || "Unnamed"}</span>
          <span className="block truncate text-xs text-muted">{[u.phone, u.email].filter(Boolean).join(" · ") || "No contact"}</span>
        </span>
      </span>
    ),
  },
  { key: "status", header: "Status", cell: (u) => <UserStatusBadge status={u.status} /> },
  {
    key: "profile",
    header: "Profile",
    cell: (u) =>
      u.onboardingComplete ? <Badge tone="info">Complete</Badge> : <Badge>Onboarding</Badge>,
  },
  {
    key: "plan",
    header: "Plan",
    cell: (u) =>
      u.isPremium ? (
        <span className="flex flex-col">
          <Badge tone="primary">Premium</Badge>
          {u.premiumUntil && <span className="mt-0.5 text-xs text-muted">until {formatDate(u.premiumUntil)}</span>}
        </span>
      ) : (
        <span className="text-muted">Free</span>
      ),
  },
  { key: "joined", header: "Joined", cell: (u) => <span className="text-muted">{formatDate(u.createdAt)}</span> },
  { key: "seen", header: "Last active", cell: (u) => <span className="text-muted">{formatRelative(u.lastActiveAt)}</span> },
];

export function UsersTable({ users }: { users: AdminUser[] }) {
  const navigate = useNavigate();

  return (
    <DataTable
      columns={COLUMNS}
      rows={users}
      rowKey={(u) => u.id}
      onRowClick={(u) => navigate(`/users/${u.id}`)}
      empty={<EmptyState icon="users" title="No users found" description="Try a different search or status filter." />}
    />
  );
}
