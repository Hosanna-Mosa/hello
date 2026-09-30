import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { formatNumber } from "@/lib/format";

const LABELS: Record<string, string> = {
  matches: "Live matches",
  messagesSent: "Messages sent",
  likesSent: "Likes sent",
  likesReceived: "Likes received",
  reportsAgainst: "Reports against",
  reportsFiled: "Reports filed",
  blocksMade: "Blocks made",
  sessions: "Signed-in devices",
};

export function UserActivityCard({ counts }: { counts: Record<string, number> }) {
  return (
    <Card>
      <CardHeader title="Activity" />
      <ul className="grid grid-cols-2 gap-3">
        {Object.entries(LABELS).map(([key, label]) => (
          <li key={key} className="rounded-control bg-canvas p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-lg font-bold text-ink tabular-nums">{formatNumber(counts[key] ?? 0)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
