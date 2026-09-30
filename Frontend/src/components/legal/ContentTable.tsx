/** A data table inside a policy. Scrolls within its own frame on a narrow phone. */
export function ContentTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-control border border-line">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-sunken text-xs tracking-wide text-muted uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, i) => (
                <td key={i} className={i === 0 ? "px-4 py-3 font-medium text-ink" : "px-4 py-3 text-muted"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
