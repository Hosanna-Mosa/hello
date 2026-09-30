import { Icon } from "@/components/ui/Icon";
import type { RadarPerson } from "@/features/home/matcher/matcherData";
import { cn } from "@/lib/cn";

type Props = { people: RadarPerson[]; matched: Set<string> };

/** A sonar-style "nearby" radar: rings pulse out, matching people light up. */
export function Radar({ people, matched }: Props) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {/* static rings */}
      {[100, 72, 44].map((s) => (
        <span
          key={s}
          className="absolute top-1/2 left-1/2 -translate-1/2 rounded-full border border-dashed border-line-strong"
          style={{ width: `${s}%`, height: `${s}%` }}
        />
      ))}
      {/* pulses + sweep */}
      {[0, 0.9, 1.8].map((d) => (
        <span
          key={d}
          aria-hidden="true"
          className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-primary/40"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
      <span
        aria-hidden="true"
        className="absolute inset-[2%] animate-sweep rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,var(--color-primary)_50deg,transparent_52deg)] opacity-15"
      />

      {/* you */}
      <span className="absolute top-1/2 left-1/2 grid size-16 -translate-1/2 place-items-center rounded-full bg-primary font-bold text-on-primary shadow-pop ring-8 ring-primary/15">
        You
      </span>

      {people.map((p) => {
        const on = matched.has(p.name);
        return (
          <span
            key={p.name}
            className="absolute -translate-1/2 transition-all duration-500"
            style={{ top: p.top, left: p.left }}
          >
            <span
              className={cn(
                "relative grid size-12 place-items-center rounded-full border-2 font-bold transition-all duration-500",
                p.avatar,
                on ? "scale-110 animate-pop-in border-surface shadow-pop" : "scale-75 border-transparent opacity-35 grayscale",
              )}
            >
              {p.name[0]}
              {on && (
                <span className="absolute -top-1 -right-1 grid size-5 animate-pop-in place-items-center rounded-full bg-primary text-on-primary [animation-delay:200ms]">
                  <Icon name="heart" size={10} className="fill-current" />
                </span>
              )}
            </span>
            <span
              className={cn(
                "absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink shadow-card transition-opacity duration-300",
                on ? "opacity-100" : "opacity-0",
              )}
            >
              {p.name}
            </span>
          </span>
        );
      })}
    </div>
  );
}
