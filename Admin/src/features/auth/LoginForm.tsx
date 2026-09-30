/**
 * Email + password sign-in. The server does all of the checking — rate
 * limits, lockout, the session cookie. This only reports what it says.
 */

import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";

import { useAuth } from "@/auth/useAuth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/features/auth/PasswordInput";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;
  // Only ever an in-app path: never follow a redirect to another origin.
  const target = from && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field id="email" label="Email">
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </Field>
      <Field id="password" label="Password">
        <PasswordInput
          id="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={busy} disabled={!email || !password}>
        Sign in
      </Button>
    </form>
  );
}
