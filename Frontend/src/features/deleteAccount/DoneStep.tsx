import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";

export function DoneStep() {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
        <Icon name="check" size={28} />
      </span>
      <h3 className="text-lg font-semibold text-ink">Account deleted</h3>
      <p className="max-w-sm text-sm text-muted">
        Your profile, matches and conversations have been removed and you've been signed out everywhere. This can't
        be undone — signing up again creates a new account.
      </p>
      <ButtonLink to="/" className="mt-2">
        Back to home
      </ButtonLink>
    </div>
  );
}
