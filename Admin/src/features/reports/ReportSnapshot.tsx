/** The evidence frozen at report time: the profile as it was, and the last messages. */

import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AdminReport } from "@/types/admin";

export function ReportSnapshot({ report }: { report: AdminReport }) {
  const { snapshot, reported } = report;

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">Profile at report time</h3>
        <p className="mt-1 text-sm font-semibold text-ink">{snapshot.name || reported.name}</p>
        <p className="mt-0.5 text-sm text-muted">{snapshot.bio || "No bio."}</p>
      </section>
      <section>
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">Recent messages</h3>
        {snapshot.messages.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No shared conversation.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {snapshot.messages.map((m, i) => {
              const fromReported = m.senderId === reported.id;
              return (
                <li
                  key={`${m.createdAt}-${i}`}
                  className={cn("max-w-[85%] rounded-card px-3 py-2 text-sm", fromReported ? "self-start bg-danger-soft" : "self-end bg-sunken")}
                >
                  <p className="break-words text-ink">{m.body}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {fromReported ? reported.name : report.reporter.name} · {formatDateTime(m.createdAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
