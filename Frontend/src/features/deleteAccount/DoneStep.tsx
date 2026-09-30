import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/config/site";

export function DoneStep() {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
        <Icon name="check" size={28} />
      </span>
      <h3 className="text-lg font-semibold text-ink">Deletion requested</h3>
      <p className="max-w-sm text-sm text-muted">
        Your profile is hidden and you've been signed out everywhere. Your data will be permanently erased in{" "}
        {site.deletionGraceDays} days. Changed your mind? Just sign in to the app before then.
      </p>
      <ButtonLink to="/" className="mt-2">
        Back to home
      </ButtonLink>
    </div>
  );
}
