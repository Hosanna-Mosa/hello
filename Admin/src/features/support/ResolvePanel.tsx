/**
 * Resolve — which, deliberately, does not close the ticket.
 *
 * Pressing it ASKS the user "is your issue resolved?" in the app. The ticket
 * closes only when they say yes; if they say no (or just write again) it comes
 * back as open. The panel says this before and after, so nobody thinks a
 * ticket is closed when it is still waiting on the user.
 */

import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { formatRelative } from "@/lib/format";
import type { AdminSupportTicket } from "@/types/admin";

type Props = { ticket: AdminSupportTicket; onResolve: () => Promise<void> };

export function ResolvePanel({ ticket, onResolve }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setFailed(null);
    try {
      await onResolve();
      setConfirming(false);
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "Couldn't update the ticket.");
    } finally {
      setBusy(false);
    }
  };

  if (ticket.status === "resolved") {
    return (
      <Alert tone="success">
        Resolved {formatRelative(ticket.resolvedAt)} — the user confirmed the fix. This ticket is closed.
      </Alert>
    );
  }

  if (ticket.status === "pendingResolution") {
    return (
      <Alert tone="info">
        Waiting for the user to confirm (asked {formatRelative(ticket.resolutionRequestedAt)}). If they say it isn't fixed — or
        reply — the ticket reopens here.
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        When the issue is fixed, mark it resolved. The user is asked to confirm in the app, and the ticket closes only when they do.
      </p>
      <Button fullWidth onClick={() => setConfirming(true)} icon={<Icon name="check" size={16} />}>
        Mark as resolved
      </Button>
      {failed && <Alert>{failed}</Alert>}
      <ConfirmDialog
        open={confirming}
        title="Mark this ticket as resolved?"
        message={`${ticket.user.name} will be asked "Is your issue resolved?" in the app. If they say yes, the ticket closes. If they say no, it comes back as open and the conversation continues.`}
        confirmLabel="Ask the user to confirm"
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
