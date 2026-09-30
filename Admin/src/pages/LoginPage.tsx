import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/features/auth/LoginForm";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function LoginPage() {
  usePageTitle("Sign in");

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo subtitle="Admin panel" />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-xl font-bold text-ink">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Authorised staff only.</p>
          <LoginForm />
        </Card>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Icon name="shield" size={14} />
          Sessions expire automatically and every attempt is rate-limited.
        </p>
      </div>
    </div>
  );
}
