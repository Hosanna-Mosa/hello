/**
 * The one table. A real <table> from `md` up; below that each row becomes a
 * stacked card with the column headers as labels — so every list in the
 * panel works on a phone without a sideways scroll.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide on the stacked mobile card (e.g. a column already shown in the title cell). */
  hideOnMobile?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty: ReactNode;
};

export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty }: Props<T>) {
  if (rows.length === 0) return <>{empty}</>;

  const clickable = onRowClick ? "cursor-pointer hover:bg-canvas" : "";
  const click = (row: T) => (onRowClick ? () => onRowClick(row) : undefined);

  return (
    <>
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-line bg-canvas text-xs tracking-wide text-muted uppercase">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-4 py-3 font-semibold", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={rowKey(row)} className={clickable} onClick={click(row)}>
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className={cn("space-y-2 px-4 py-4", clickable)} onClick={click(row)}>
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c, i) =>
                i === 0 ? (
                  <div key={c.key}>{c.cell(row)}</div>
                ) : (
                  <div key={c.key} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted">{c.header}</span>
                    <div className="text-right">{c.cell(row)}</div>
                  </div>
                ),
              )}
          </li>
        ))}
      </ul>
    </>
  );
}
