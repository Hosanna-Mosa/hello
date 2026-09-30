import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

type Props = { eyebrow?: string; title: string; description?: string; center?: boolean };

export function SectionHeading({ eyebrow, title, description, center = false }: Props) {
  return (
    <Reveal className={cn("mb-10 max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && (
        <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-primary-deep uppercase">
          <span className="h-0.5 w-6 rounded-full bg-primary" />
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{description}</p>}
    </Reveal>
  );
}
