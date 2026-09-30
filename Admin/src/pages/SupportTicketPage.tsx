/**
 * One support ticket: the live conversation on the left, who raised it and
 * the Resolve action on the right (stacked on a phone).
 */

import { useParams } from "react-router";

import { useAuth } from "@/auth/useAuth";
import { SupportStatusBadge } from "@/components/domain/SupportStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ConversationPanel } from "@/features/support/ConversationPanel";
import { LiveBadge } from "@/features/support/LiveBadge";
import { TicketSidePanel } from "@/features/support/TicketSidePanel";
import { useSupportTicket } from "@/features/support/useSupportTicket";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SupportTicketPage() {
  const { id = "" } = useParams();
  const { admin } = useAuth();
  const t = useSupportTicket(id);
  usePageTitle(t.ticket?.subject ?? "Support ticket");

  const back = (
    <ButtonLink to="/support" icon={<Icon name="arrowLeft" size={16} />}>
      All tickets
    </ButtonLink>
  );

  if (t.error && !t.ticket) {
    return (
      <>
        <PageHeader title="Support ticket" actions={back} />
        <Alert action={<Button size="sm" variant="secondary" onClick={() => void t.reload()}>Retry</Button>}>{t.error}</Alert>
      </>
    );
  }

  if (!t.ticket) {
    return (
      <div className="grid place-items-center py-24 text-primary">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t.ticket.subject}
        description={`${t.ticket.user.name} · ticket ${t.ticket.id.slice(-6)}`}
        actions={
          <>
            <SupportStatusBadge status={t.ticket.status} />
            <LiveBadge />
            {back}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ConversationPanel
            ticket={t.ticket}
            messages={t.messages}
            pending={t.pending}
            userTyping={t.userTyping}
            myAdminId={admin?.id}
            onSend={t.send}
            onRetry={t.retry}
            onDiscard={t.discard}
            onTyping={t.emitTyping}
          />
        </div>
        <TicketSidePanel ticket={t.ticket} onResolve={t.resolve} />
      </div>
    </>
  );
}
