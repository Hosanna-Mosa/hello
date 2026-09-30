/**
 * A whole policy page from a ContentDoc: hero, contents, sections, contact.
 * Privacy, Terms, Guidelines and Child Safety all render through this.
 */

import type { ReactNode } from "react";

import { ContactCard } from "@/components/legal/ContactCard";
import { ContentSectionView } from "@/components/legal/ContentSectionView";
import { PageHero } from "@/components/legal/PageHero";
import { TableOfContents } from "@/components/legal/TableOfContents";
import { Container } from "@/components/ui/Container";
import { site } from "@/config/site";
import type { ContentDoc } from "@/types/content";

type Props = { doc: ContentDoc; contactEmail?: string; aside?: ReactNode };

export function ContentDocument({ doc, contactEmail = site.supportEmail, aside }: Props) {
  return (
    <>
      <PageHero
        eyebrow={doc.eyebrow}
        title={doc.title}
        summary={doc.summary}
        meta={<>Effective {site.effectiveDate} · Applies to the {site.appName} app for Android</>}
      />
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[260px_1fr] lg:gap-14">
        <aside className="flex flex-col gap-6">
          <TableOfContents sections={doc.sections} />
          {aside}
        </aside>
        <article className="flex max-w-3xl min-w-0 flex-col gap-12">
          {doc.sections.map((section, i) => (
            <ContentSectionView key={section.id} section={section} index={i} />
          ))}
          <ContactCard email={contactEmail} />
        </article>
      </Container>
    </>
  );
}
