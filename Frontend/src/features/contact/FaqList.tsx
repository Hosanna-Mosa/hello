import { Icon } from "@/components/ui/Icon";

export type Faq = { q: string; a: string };

/** Native <details> — keyboard and screen-reader friendly with no script. */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-card border border-line bg-surface">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <Icon name="arrowRight" size={18} className="shrink-0 text-faint transition-transform group-open:rotate-90" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
