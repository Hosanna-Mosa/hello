import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import type { Phone } from "@/lib/api";

type Props = { phone: Phone; busy: boolean; onSubmit: (code: string) => void; onResend: () => void; onBack: () => void };

export function CodeStep({ phone, busy, onSubmit, onResend, onBack }: Props) {
  const [code, setCode] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === 6) onSubmit(code);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted">
        We sent a code to <span className="font-semibold text-ink">+{phone.countryCode} {phone.phoneNumber}</span>. It expires in 5 minutes.
      </p>
      <Field id="code" label="6-digit code">
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="text-center text-lg tracking-[0.5em]"
        />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={busy} disabled={code.length !== 6}>
        Verify
      </Button>
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={busy}>
          Change number
        </Button>
        <Button variant="ghost" size="sm" onClick={onResend} disabled={busy}>
          Resend code
        </Button>
      </div>
    </form>
  );
}
