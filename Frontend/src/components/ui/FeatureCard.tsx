import { Card } from "@/components/ui/Card";
import type { IconName } from "@/components/ui/Icon";
import { IconBadge, type IconBadgeTone } from "@/components/ui/IconBadge";

type Props = { icon: IconName; title: string; body: string; tone?: IconBadgeTone };

/** Icon + title + one paragraph. Used for every feature/point grid on the site. */
export function FeatureCard({ icon, title, body, tone = "primary" }: Props) {
  return (
    <Card className="group flex h-full flex-col gap-4 transition duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-pop">
      <IconBadge icon={icon} tone={tone} />
      <div>
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </Card>
  );
}
