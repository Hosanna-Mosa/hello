import { StatCard } from "@/components/ui/StatCard";
import { formatNumber } from "@/lib/format";
import type { DashboardStats } from "@/types/admin";

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  const { users, matches, reports, calls } = stats;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total users" value={users.total} icon="users" hint={`${formatNumber(users.new7d)} joined in the last 7 days`} />
      <StatCard label="Active today" value={users.active24h} icon="activity" hint={`${formatNumber(users.active7d)} active this week`} />
      <StatCard label="Live matches" value={matches.live} icon="heart" hint={`${formatNumber(matches.total)} matches all-time`} />
      <StatCard label="Open reports" value={reports.open} icon="flag" hint={`${formatNumber(reports.total)} reports all-time`} />
      <StatCard label="Messages" value={stats.messages} icon="message" hint="All messages sent" />
      <StatCard label="Likes" value={stats.likes} icon="heart" hint="All likes sent" />
      <StatCard label="Voice calls" value={calls.total} icon="phone" hint={`${formatNumber(calls.completed)} completed`} />
      <StatCard label="Blocks" value={stats.blocks} icon="ban" hint="Users blocked by others" />
    </div>
  );
}
