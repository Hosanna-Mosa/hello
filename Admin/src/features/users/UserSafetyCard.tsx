/**
 * Account state and the actions on it: suspend / reactivate, sign out
 * everywhere, and delete. Each answers with the server's fresh view of the
 * user, so the page never shows a state the server did not confirm.
 */

import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/format";
import { usersService } from "@/services/admin.service";
import type { AdminUserDetail } from "@/types/admin";

type Props = { user: AdminUserDetail; onChanged: (next?: AdminUserDetail) => void };
type Dialog = null | "revoke" | "suspend" | "delete";

export function UserSafetyCard({ user, onChanged }: Props) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const erased = user.status === "erased";
  const suspended = user.status === "suspended";

  const close = () => {
    setDialog(null);
    setReason("");
    setTyped("");
  };

  const run = async (action: () => Promise<AdminUserDetail | void>, success: string) => {
    setBusy(true);
    try {
      const next = await action();
      setResult({ ok: true, text: success });
      onChanged(next ?? undefined);
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "That didn't work." });
    } finally {
      setBusy(false);
      close();
    }
  };

  return (
    <Card>
      <CardHeader title="Account" />
      <div className="flex flex-col gap-4">
        {suspended && (
          <DescriptionList
            items={[
              { label: "Suspended", value: formatDateTime(user.suspendedAt) },
              { label: "Reason", value: user.suspendedReason || "—" },
            ]}
          />
        )}
        {(user.status === "pendingDeletion" || erased) && (
          <DescriptionList
            items={[
              { label: erased ? "Deleted" : "Deletion requested", value: formatDateTime(user.deletionRequestedAt) },
              { label: "Reason given", value: user.deletionReason || "—" },
            ]}
          />
        )}
        {result && <Alert tone={result.ok ? "success" : "danger"}>{result.text}</Alert>}

        {!erased && (
          <div className="flex flex-col gap-2">
            {suspended ? (
              <Button
                icon={<Icon name="check" size={16} />}
                loading={busy}
                onClick={() => void run(() => usersService.setStatus(user.id, "active"), "Account reactivated.")}
              >
                Reactivate account
              </Button>
            ) : (
              <Button variant="secondary" icon={<Icon name="ban" size={16} />} onClick={() => setDialog("suspend")}>
                Suspend account
              </Button>
            )}
            <Button
              variant="secondary"
              icon={<Icon name="logout" size={16} />}
              disabled={user.counts.sessions === 0}
              onClick={() => setDialog("revoke")}
            >
              Sign out of all devices
            </Button>
            <Button variant="danger" icon={<Icon name="alert" size={16} />} onClick={() => setDialog("delete")}>
              Delete account
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={dialog === "revoke"}
        title="Sign out everywhere?"
        message={`${user.name || "This user"} will be signed out on every device and must sign in again.`}
        confirmLabel="Sign out"
        danger
        busy={busy}
        onConfirm={() => void run(() => usersService.revokeSessions(user.id), "Signed out of every device.")}
        onCancel={close}
      />

      <Modal
        open={dialog === "suspend"}
        title="Suspend this account?"
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                void run(() => usersService.setStatus(user.id, "suspended", reason.trim() || undefined), "Account suspended.")
              }
            >
              Suspend
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            They are signed out everywhere at once, hidden from everyone, and cannot sign in until reactivated.
          </p>
          <Field id="suspend-reason" label="Reason (internal)">
            <Input id="suspend-reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "delete"}
        title="Delete this account?"
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={typed !== "DELETE"}
              onClick={() => void run(() => usersService.deleteUser(user.id, reason.trim() || undefined), "Account deleted and archived.")}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Immediate and irreversible: their profile, matches and conversations are removed and their phone and email are
            freed. A copy is kept in the deleted-accounts archive.
          </p>
          <Field id="delete-reason" label="Reason (internal)">
            <Input id="delete-reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Field id="delete-typed" label="Type DELETE to confirm">
            <Input id="delete-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}
