/** The tier, and the admin's manual grant / revoke (testers, support, refunds). */

import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { formatDateTime, humanize } from "@/lib/format";
import { usersService } from "@/services/admin.service";
import type { AdminUserDetail } from "@/types/admin";

type Props = { user: AdminUserDetail; onChanged: (next: AdminUserDetail) => void };

export function UserPremiumCard({ user, onChanged }: Props) {
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const erased = user.status === "erased";
  const daysNumber = Number(days);
  const daysValid = days === "" || (Number.isInteger(daysNumber) && daysNumber >= 1 && daysNumber <= 3650);

  const apply = async (isPremium: boolean) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await usersService.setPremium(user.id, isPremium, isPremium && days !== "" ? daysNumber : undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change premium.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Premium" />
      <div className="flex flex-col gap-4">
        <div>{user.premium.active ? <Badge tone="primary">Premium</Badge> : <Badge>Free</Badge>}</div>
        <DescriptionList
          items={[
            { label: "Since", value: formatDateTime(user.premium.since) },
            { label: "Ends", value: user.premium.active && !user.premium.expiresAt ? "No end date" : formatDateTime(user.premium.expiresAt) },
            { label: "Source", value: user.premium.source ? humanize(user.premium.source) : "—" },
          ]}
        />
        {error && <Alert tone="danger">{error}</Alert>}
        {!erased && (
          <>
            <Field id="premium-days" label="Days" hint="Leave empty for no end date." error={daysValid ? null : "1–3650 days"}>
              <Input id="premium-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void apply(true)} loading={busy} disabled={!daysValid}>
                {user.premium.active ? "Replace grant" : "Grant premium"}
              </Button>
              {user.premium.active && (
                <Button variant="secondary" onClick={() => void apply(false)} disabled={busy}>
                  Revoke premium
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
