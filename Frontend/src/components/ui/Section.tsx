import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

const TONES = { plain: "", surface: "bg-surface border-y border-line", soft: "bg-primary-soft/60" } as const;

type Props = HTMLAttributes<HTMLElement> & { tone?: keyof typeof TONES; children: ReactNode };

/** Vertical rhythm: every page band is a Section, so spacing is identical site-wide. */
export function Section({ tone = "plain", className, ...rest }: Props) {
  return <section className={cn("py-14 sm:py-20", TONES[tone], className)} {...rest} />;
}
