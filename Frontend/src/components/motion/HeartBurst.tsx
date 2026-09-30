import type { CSSProperties } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const COUNT = 16;

/** Precomputed so every burst is the same shape: a ring of hearts flying outwards. */
const HEARTS = Array.from({ length: COUNT }, (_, i) => {
  const angle = (i / COUNT) * Math.PI * 2;
  const radius = 110 + (i % 3) * 40;
  return {
    tx: Math.round(Math.cos(angle) * radius),
    ty: Math.round(Math.sin(angle) * radius),
    rot: (i % 2 ? 1 : -1) * (15 + i * 4),
    delay: (i % 4) * 70,
    size: 14 + (i % 3) * 7,
  };
});

/** A one-shot burst of hearts from the centre of its (relative) parent. */
export function HeartBurst({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute top-1/2 left-1/2", className)}>
      {HEARTS.map((h, i) => (
        <span
          key={i}
          className={cn("absolute top-0 left-0 animate-heart-burst", i % 3 === 0 ? "text-secondary" : "text-primary")}
          style={{ "--tx": `${h.tx}px`, "--ty": `${h.ty}px`, "--rot": `${h.rot}deg`, animationDelay: `${h.delay}ms` } as CSSProperties}
        >
          <Icon name="heart" size={h.size} className="fill-current" />
        </span>
      ))}
    </div>
  );
}
