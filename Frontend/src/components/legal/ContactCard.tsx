import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { IconBadge } from "@/components/ui/IconBadge";
import { site } from "@/config/site";

/** "Questions? Write to us." — closes every policy page. */
export function ContactCard({ email }: { email: string }) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <IconBadge icon="mail" />
      <div className="flex-1">
        <h2 className="font-semibold text-ink">Questions about this page?</h2>
        <p className="mt-1 text-sm text-muted">
          Write to {site.company} at <span className="font-medium text-ink">{email}</span> and a real person will read it.
        </p>
      </div>
      <ButtonLink href={`mailto:${email}`} variant="primary" icon={<Icon name="mail" size={16} />}>
        Email us
      </ButtonLink>
    </Card>
  );
}
