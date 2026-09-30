import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { site } from "@/config/site";

type Props = { busy: boolean; onConfirm: (reason: string) => void; onCancel: () => void };

/** The same typed confirmation the app uses: nothing is deleted by one stray click. */
export function ConfirmStep({ busy, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (typed === "DELETE") onConfirm(reason);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Alert tone="warning" title="This removes your profile, matches and conversations.">
        You'll be signed out on every device. You have {site.deletionGraceDays} days to change your mind by signing in again — after
        that, it can't be undone.
      </Alert>
      <Field id="reason" label="Why are you leaving? (optional)">
        <Input id="reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field id="typed" label="Type DELETE to confirm">
        <Input id="typed" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </Field>
      <Button type="submit" variant="danger" size="lg" fullWidth loading={busy} disabled={typed !== "DELETE"}>
        Delete my account
      </Button>
      <Button variant="ghost" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
    </form>
  );
}
