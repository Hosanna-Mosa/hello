/** "Try it": pick interests and watch sample people who share them light up on a radar. */

import { useMemo, useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { INTERESTS, PEOPLE, type Interest } from "@/features/home/matcher/matcherData";
import { Radar } from "@/features/home/matcher/Radar";
import { cn } from "@/lib/cn";

export function InterestMatcher() {
  const [picked, setPicked] = useState<Interest[]>(["☕ Coffee", "🥾 Hiking"]);

  const matched = useMemo(
    () => new Set(PEOPLE.filter((p) => p.interests.some((i) => picked.includes(i))).map((p) => p.name)),
    [picked],
  );

  const toggle = (i: Interest) => setPicked((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  return (
    <div className="grid items-center gap-14 lg:grid-cols-2">
      <div>
        <SectionHeading
          eyebrow="Try it"
          title="Pick what you're into. Watch your people appear."
          description="Tap a few interests — the radar lights up nearby sample profiles who share them. That's how discovery works in the app."
        />
        <Reveal delay={100}>
          <div className="flex flex-wrap gap-2.5">
            {INTERESTS.map((i) => {
              const on = picked.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(i)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 active:scale-95",
                    on
                      ? "scale-105 border-primary bg-primary text-on-primary shadow-card"
                      : "border-line-strong bg-surface text-ink hover:-translate-y-0.5 hover:border-primary/50",
                  )}
                >
                  {i}
                </button>
              );
            })}
          </div>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-7 flex items-baseline gap-2 text-muted" aria-live="polite">
            <span key={matched.size} className="inline-block animate-pop-in text-4xl font-extrabold text-primary">
              {matched.size}
            </span>
            {matched.size === 1 ? "person nearby shares" : "people nearby share"} {picked.length ? "your interests" : "— pick something!"}
          </p>
        </Reveal>
      </div>

      <Reveal from="zoom">
        <Radar people={PEOPLE} matched={matched} />
      </Reveal>
    </div>
  );
}
