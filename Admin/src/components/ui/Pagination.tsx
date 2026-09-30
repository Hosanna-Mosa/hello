import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";

type Props = { page: number; pages: number; total: number; limit: number; onChange: (page: number) => void };

export function Pagination({ page, pages, total, limit, onChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
      <p className="text-sm text-muted">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          icon={<Icon name="chevronLeft" size={16} />}
        >
          Prev
        </Button>
        <span className="px-2 text-sm text-muted tabular-nums">
          {page} / {pages}
        </span>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
          <Icon name="chevronRight" size={16} />
        </Button>
      </div>
    </nav>
  );
}
