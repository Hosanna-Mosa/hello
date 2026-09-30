import { ContentBlockView } from "@/components/legal/ContentBlockView";
import type { ContentSection } from "@/types/content";

export function ContentSectionView({ section, index }: { section: ContentSection; index: number }) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-title`} className="flex flex-col gap-4">
      <h2 id={`${section.id}-title`} className="text-2xl font-bold tracking-tight text-ink">
        <span className="mr-2 text-primary">{index + 1}.</span>
        {section.title}
      </h2>
      {section.blocks.map((block, i) => (
        <ContentBlockView key={i} block={block} />
      ))}
    </section>
  );
}
