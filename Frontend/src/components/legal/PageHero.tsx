import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";

type Props = { eyebrow: string; title: string; summary: string; meta?: ReactNode };

/** The top band of every inner page. */
export function PageHero({ eyebrow, title, summary, meta }: Props) {
  return (
    <div className="border-b border-line bg-gradient-to-b from-primary-soft/70 to-canvas">
      <Container className="py-12 sm:py-16">
        <p className="text-sm font-semibold tracking-wide text-primary-deep uppercase">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{summary}</p>
        {meta && <div className="mt-5 text-sm text-muted">{meta}</div>}
      </Container>
    </div>
  );
}
