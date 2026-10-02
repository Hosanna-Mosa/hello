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
          <p className="text-sm text-muted">{[user.phoneE164 ?? user.phone, user.email].filter(Boolean).join(" · ") || "No contact on file"}</p>
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
          { label: "User ID", value: <span className="font-mono text-xs">{user.id}</span> },
          { label: "Email", value: user.email ?? "—" },
          { label: "Phone", value: user.phoneE164 ?? user.phone ?? "—" },
          { label: "Birthday", value: user.birthday ? `${user.birthday} (${user.age ?? "?"})` : "—" },
          {
            label: "Gender",
            value: user.gender
              ? `${user.genderLabel || humanize(user.gender)}${user.showGender ? "" : " (hidden from others)"}`
              : "—",
          },
          { label: "City", value: user.location?.city ?? user.city ?? "—" },
          {
            label: "Location",
            value: user.location ? (
              <a
                className="text-primary-hover hover:underline"
                href={`https://www.openstreetmap.org/?mlat=${user.location.latitude}&mlon=${user.location.longitude}#map=13/${user.location.latitude}/${user.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {user.location.latitude.toFixed(4)}, {user.location.longitude.toFixed(4)}
                {user.location.accuracyMetres ? ` (±${user.location.accuracyMetres} m)` : ""}
              </a>
            ) : (
              "—"
            ),
          },
          { label: "Location updated", value: formatDateTime(user.location?.updatedAt ?? null) },
          { label: "Discoverable", value: user.discoverable ? "Yes" : "No" },
          { label: "Timezone", value: user.timezone },
          { label: "Joined", value: formatDateTime(user.createdAt) },
          { label: "Last active", value: formatRelative(user.lastActiveAt) },
          { label: "Onboarding", value: user.onboardingComplete ? "Complete" : "Not finished" },
          { label: "Role", value: humanize(user.role) },
          { label: "Interests", value: user.interestIds.length ? user.interestIds.map(humanize).join(", ") : "—" },
          { label: "Bio", value: user.bio || "—" },
          {
            label: "Notifications",
            value:
              Object.entries(user.notifications)
                .filter(([, on]) => on)
                .map(([k]) => humanize(k))
                .join(", ") || "All off",
          },
        ]}
      />
    </Card>
  );
}
