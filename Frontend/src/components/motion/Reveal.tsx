import type { CSSProperties, ReactNode } from "react";

import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";

type Props = { children: ReactNode; delay?: number; from?: "up" | "left" | "right" | "zoom"; className?: string };

/**
 * Eases its children into place as they scroll into view. The motion itself
 * is CSS (`.reveal` in styles/motion.css), so reduced-motion users just see
 * the content.
 */
export function Reveal({ children, delay = 0, from = "up", className }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-from={from}
      className={cn("reveal", inView && "is-visible", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
