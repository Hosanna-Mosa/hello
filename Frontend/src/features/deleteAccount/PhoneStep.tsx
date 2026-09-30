import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import type { Phone } from "@/lib/api";

type Props = { initial: Phone; busy: boolean; onSubmit: (phone: Phone) => void };

export function PhoneStep({ initial, busy, onSubmit }: Props) {
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber);
  const valid = /^\d{1,4}$/.test(countryCode) && phoneNumber.replace(/\D/g, "").length >= 6;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit({ countryCode, phoneNumber: phoneNumber.replace(/\D/g, "") });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted">Enter the phone number you use to sign in. We'll text you a 6-digit code to confirm it's you.</p>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <Field id="country" label="Country code">
          <Input
            id="country"
            inputMode="numeric"
            autoComplete="tel-country-code"
            maxLength={4}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ""))}
            leading={<span className="text-sm">+</span>}
          />
        </Field>
        <Field id="phone" label="Phone number">
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={20}
            placeholder="98765 43210"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" size="lg" fullWidth loading={busy} disabled={!valid}>
        Send code
      </Button>
    </form>
  );
}
