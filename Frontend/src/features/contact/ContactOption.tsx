import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import type { IconName } from "@/components/ui/Icon";
import { IconBadge } from "@/components/ui/IconBadge";

type Props = { icon: IconName; title: string; body: string; email: string };

export function ContactOption({ icon, title, body, email }: Props) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <IconBadge icon={icon} />
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
        <p className="mt-3 text-sm font-medium break-all text-ink">{email}</p>
      </div>
      <ButtonLink href={`mailto:${email}`} variant="secondary" size="sm" className="self-start">
        Send an email
      </ButtonLink>
    </Card>
  );
}
