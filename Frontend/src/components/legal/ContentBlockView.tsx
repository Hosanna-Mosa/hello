import { ContentTable } from "@/components/legal/ContentTable";
import { Alert } from "@/components/ui/Alert";
import type { ContentBlock } from "@/types/content";

/** Renders one block of policy content. The only place policy markup is decided. */
export function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "p":
      return <p className="leading-relaxed text-muted">{block.text}</p>;
    case "list":
      return (
        <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-muted marker:text-primary">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="flex flex-col gap-3">
          {block.items.map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-deep">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed text-muted">{item}</span>
            </li>
          ))}
        </ol>
      );
    case "table":
      return <ContentTable head={block.head} rows={block.rows} />;
    case "note":
      return <Alert tone={block.tone ?? "info"}>{block.text}</Alert>;
  }
}
