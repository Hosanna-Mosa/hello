import { Card } from "@/components/ui/Card";
import type { IconName } from "@/components/ui/Icon";
import { IconBadge, type IconBadgeTone } from "@/components/ui/IconBadge";

type Props = { icon: IconName; tone: IconBadgeTone; title: string; items: string[] };

/** One column of "what happens to your data" on the Delete Account page. */
export function DataFateCard({ icon, tone, title, items }: Props) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <IconBadge icon={icon} tone={tone} />
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
      </div>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted marker:text-primary">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}
