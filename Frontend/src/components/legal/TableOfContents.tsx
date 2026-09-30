import type { ContentSection } from "@/types/content";

/** In-page links to every section. Sticky beside the text on wide screens. */
export function TableOfContents({ sections }: { sections: ContentSection[] }) {
  return (
    <nav aria-label="On this page" className="rounded-card border border-line bg-surface p-5 lg:sticky lg:top-24">
      <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">On this page</p>
      <ol className="flex flex-col gap-1.5 text-sm">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="flex gap-2 text-muted transition-colors hover:text-primary-deep">
              <span className="w-5 shrink-0 text-faint tabular-nums">{i + 1}.</span>
              <span>{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
