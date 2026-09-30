import { Reveal } from "@/components/motion/Reveal";
import { FeatureCard } from "@/components/ui/FeatureCard";
import type { IconName } from "@/components/ui/Icon";
import type { IconBadgeTone } from "@/components/ui/IconBadge";

export type Feature = { icon: IconName; title: string; body: string; tone?: IconBadgeTone };

/** The responsive grid of FeatureCards used by every "points" band on the site. Cards stagger in. */
export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f, i) => (
        <Reveal key={f.title} delay={(i % 3) * 110} className="h-full">
          <FeatureCard {...f} />
        </Reveal>
      ))}
    </div>
  );
}
