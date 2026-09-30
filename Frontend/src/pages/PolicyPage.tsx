/**
 * Privacy, Terms, Guidelines and Child Safety are each a content document
 * rendered by the one shared <ContentDocument>, so they can never drift apart
 * in layout. Routes pass the document (see App.tsx).
 */

import { ContentDocument } from "@/components/legal/ContentDocument";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { ContentDoc } from "@/types/content";

export default function PolicyPage({ doc, email }: { doc: ContentDoc; email?: string }) {
  usePageTitle(doc.title);
  return <ContentDocument doc={doc} {...(email ? { contactEmail: email } : {})} />;
}
