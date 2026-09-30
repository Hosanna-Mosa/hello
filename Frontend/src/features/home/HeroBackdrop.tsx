/** Decorative motion behind and around the hero: drifting colour blobs and floating interest chips. */

import { cn } from "@/lib/cn";

const BLOBS = [
  "top-[-10%] left-[-8%] size-[28rem] bg-primary/20",
  "top-[20%] right-[-10%] size-[32rem] bg-secondary/20 [animation-delay:-6s]",
  "bottom-[-20%] left-[30%] size-[24rem] bg-info/10 [animation-delay:-12s]",
];

export function HeroBlobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {BLOBS.map((b) => (
        <span key={b} className={cn("absolute animate-blob rounded-full blur-3xl", b)} />
      ))}
    </div>
  );
}

const CHIPS = [
  { label: "☕ Coffee", className: "-top-10 -left-14", delay: "0s" },
  { label: "🎲 Game night", className: "top-24 -right-20", delay: "-2s" },
  { label: "🥾 Hikes", className: "bottom-36 -left-20", delay: "-4s" },
  { label: "🎸 Open mic", className: "-right-12 bottom-12", delay: "-1s" },
  { label: "👋 2 km away", className: "-top-4 right-4", delay: "-3s" },
];

/** Interest chips bobbing around the deck (wide screens only, where there's room). */
export function FloatingChips() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 hidden xl:block">
      {CHIPS.map((c) => (
        <span
          key={c.label}
          className={cn(
            "absolute animate-float rounded-full border border-line bg-surface/90 px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-ink shadow-card backdrop-blur",
            c.className,
          )}
          style={{ animationDelay: c.delay }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}
