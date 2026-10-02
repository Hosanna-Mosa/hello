import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

type Props = { busy: boolean; onSubmit: (identifier: string, password: string) => void };

/** The app's own sign-in: the email or phone number on the account, and its password. */
export function SignInStep({ busy, onSubmit }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const valid = identifier.trim().length >= 3 && password.length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit(identifier, password);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted">Sign in with the email or phone number and password you use in the app.</p>
      <Field id="identifier" label="Email or phone number">
        <Input
          id="identifier"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          placeholder="you@example.com or +91 98765 43210"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </Field>
      <Field id="password" label="Password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={busy} disabled={!valid}>
        Continue
      </Button>
    </form>
  );
}
