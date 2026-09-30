import { UserStatusBadge } from "@/components/domain/UserStatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { formatDateTime, formatRelative, humanize } from "@/lib/format";
import type { AdminUserDetail } from "@/types/admin";

export function UserProfileCard({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={user.name || "?"} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-ink">{user.name || "Unnamed"}</h2>
          <p className="text-sm text-muted">{user.phone ?? "No phone on file"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <UserStatusBadge status={user.status} />
          {user.isPremium && <Badge tone="primary">Premium</Badge>}
          {!user.discoverable && <Badge>Hidden from discovery</Badge>}
        </div>
      </div>
      <CardHeader title="Profile" />
      <DescriptionList
        items={[
          { label: "Age", value: user.age ?? "—" },
          { label: "Gender", value: user.gender ? humanize(user.gender) : "—" },
          { label: "City", value: user.city ?? "—" },
          { label: "Timezone", value: user.timezone },
          { label: "Joined", value: formatDateTime(user.createdAt) },
          { label: "Last active", value: formatRelative(user.lastActiveAt) },
          { label: "Onboarding", value: user.onboardingComplete ? "Complete" : "Not finished" },
          { label: "Role", value: humanize(user.role) },
          { label: "Interests", value: user.interestIds.length ? user.interestIds.map(humanize).join(", ") : "—" },
          { label: "Bio", value: user.bio || "—" },
        ]}
      />
    </Card>
  );
}
