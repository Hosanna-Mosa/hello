/**
 * The support queue. Updates by itself: a new ticket, a user's reply or a
 * status change arrives over the live connection and the list re-sorts, so an
 * operator never has to refresh to see what needs answering.
 */

import { useRef } from "react";
import { useNavigate } from "react-router";

import { AsyncContent } from "@/components/ui/AsyncContent";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { LiveBadge } from "@/features/support/LiveBadge";
import { SupportFilters } from "@/features/support/SupportFilters";
import { SupportTicketsTable } from "@/features/support/SupportTicketsTable";
import { useAsync } from "@/hooks/useAsync";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParamState } from "@/hooks/useSearchParamState";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useSupportSummary } from "@/hooks/useSupportSummary";
import { supportService } from "@/services/admin.service";
import type { AdminSupportTicket, SupportTicketStatus } from "@/types/admin";

const KEYS = ["status", "search"] as const;
const RELOAD_DEBOUNCE_MS = 400;

const byActivity = (a: AdminSupportTicket, b: AdminSupportTicket) =>
  new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();

export default function SupportPage() {
  usePageTitle("Support");
  const navigate = useNavigate();
  const { values, page, set } = useSearchParamState(KEYS);
  const status = values.status as SupportTicketStatus | "";
  const summary = useSupportSummary();
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, error, loading, reload, setData } = useAsync(
    () => supportService.list({ page, status, search: values.search }),
    [page, status, values.search],
  );

  /**
   * A ticket changed somewhere. If it is on this page and still matches the
   * filter, update it in place and re-sort; anything else (a new ticket, one
   * that moved in or out of this filter) is a debounced reload — cheap, and
   * never wrong about pagination.
   */
  useSocketEvent<{ ticket: AdminSupportTicket }>("support:ticket:updated", ({ ticket }) => {
    const onPage = data?.items.some((t) => t.id === ticket.id);
    const stillMatches = !status || ticket.status === status;
    if (onPage && stillMatches && !values.search) {
      setData((prev) => (prev ? { ...prev, items: prev.items.map((t) => (t.id === ticket.id ? ticket : t)).sort(byActivity) } : prev));
      return;
    }
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => void reload(), RELOAD_DEBOUNCE_MS);
  });

  return (
    <>
      <PageHeader
        title="Support"
        description="Tickets raised in the app. Reply, and mark one resolved when it's fixed — the user confirms before it closes."
        actions={<LiveBadge />}
      />
      <Card padded={false} className="overflow-hidden">
        <SupportFilters status={values.status} search={values.search} summary={summary} onChange={set} />
        <AsyncContent data={data} loading={loading} error={error} onRetry={reload}>
          {(result) => (
            <>
              <SupportTicketsTable
                tickets={result.items}
                filtered={Boolean(status || values.search)}
                onOpen={(t) => navigate(`/support/${t.id}`)}
              />
              {result.total > 0 && (
                <Pagination page={result.page} pages={result.pages} total={result.total} limit={result.limit} onChange={(p) => set({ page: p })} />
              )}
            </>
          )}
        </AsyncContent>
      </Card>
    </>
  );
}
