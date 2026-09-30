/** Deletion state and the one account action: sign the user out everywhere. */

import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime } from "@/lib/format";
import { usersService } from "@/services/admin.service";
import type { AdminUserDetail } from "@/types/admin";

export function UserSafetyCard({ user, onChanged }: { user: AdminUserDetail; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const revoke = async () => {
    setBusy(true);
    try {
      await usersService.revokeSessions(user.id);
      setResult({ ok: true, text: "Signed out of every device." });
      onChanged();
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Could not sign the user out." });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Account" />
      <div className="flex flex-col gap-4">
        {user.status === "pendingDeletion" && (
          <DescriptionList
            items={[
              { label: "Deletion requested", value: formatDateTime(user.deletionRequestedAt) },
              { label: "Data erased on", value: formatDateTime(user.purgeAt) },
              { label: "Reason given", value: user.deletionReason || "—" },
            ]}
          />
        )}
        {result && <Alert tone={result.ok ? "success" : "danger"}>{result.text}</Alert>}
        <Button
          variant="danger"
          icon={<Icon name="logout" size={16} />}
          disabled={user.counts.sessions === 0}
          onClick={() => setConfirming(true)}
        >
          Sign out of all devices
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Sign out everywhere?"
        message={`${user.name || "This user"} will be signed out on every device and must sign in again with their phone.`}
        confirmLabel="Sign out"
        danger
        busy={busy}
        onConfirm={revoke}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}
