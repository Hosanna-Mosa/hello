import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const TONES = {
  primary: "bg-primary-soft text-primary-deep",
  secondary: "bg-secondary-soft text-secondary-deep",
  danger: "bg-danger-soft text-danger",
} as const;

export type IconBadgeTone = keyof typeof TONES;

export function IconBadge({ icon, tone = "primary" }: { icon: IconName; tone?: IconBadgeTone }) {
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6", TONES[tone])}>
      <Icon name={icon} />
    </span>
  );
}
