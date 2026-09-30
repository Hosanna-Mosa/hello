import type { ReactNode } from "react";

export type Detail = { label: string; value: ReactNode };

export function DescriptionList({ items }: { items: Detail[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((d) => (
        <div key={d.label} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-muted uppercase">{d.label}</dt>
          <dd className="mt-1 text-sm break-words text-ink">{d.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
