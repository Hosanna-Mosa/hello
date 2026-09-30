/**
 * New sign-ups per day, last 14 days. One series, so no legend — the card
 * title names it. Bars are the chart token (a darker teal that clears 3:1 on
 * the surface), rounded only at the data end, with a per-bar hover tooltip
 * and a screen-reader table carrying the same numbers.
 */

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { formatNumber } from "@/lib/format";

type Point = { date: string; count: number };

const W = 560;
const H = 180;
const PAD_BOTTOM = 22;
const GAP = 6;

const shortDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export function SignupChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const slot = W / data.length;
  const barW = slot - GAP;
  const plotH = H - PAD_BOTTOM;
  const total = data.reduce((s, d) => s + d.count, 0);
  const active = hover === null ? null : data[hover];

  return (
    <Card>
      <CardHeader title="New sign-ups" description={`${formatNumber(total)} in the last 14 days`} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" role="img" aria-label="Daily sign-ups, last 14 days">
          <line x1={0} x2={W} y1={plotH} y2={plotH} className="stroke-line" strokeWidth={1} />
          {data.map((d, i) => {
            const h = d.count === 0 ? 0 : Math.max(4, (d.count / max) * (plotH - 8));
            const x = i * slot + GAP / 2;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
                <path
                  d={`M${x},${plotH} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${Math.max(0, h - 4)} z`}
                  className={hover === i ? "fill-primary" : "fill-chart"}
                />
                {(i % 2 === 0 || data.length <= 7) && (
                  <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="fill-muted text-[10px]">
                    {shortDay(d.date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {active && (
          <div className="pointer-events-none absolute top-0 right-0 rounded-control border border-line bg-surface px-3 py-2 text-xs shadow-pop">
            <p className="text-muted">{shortDay(active.date)}</p>
            <p className="font-semibold text-ink">{formatNumber(active.count)} sign-ups</p>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>Daily sign-ups</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
