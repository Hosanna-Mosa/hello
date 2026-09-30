import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";

type Props = { icon?: IconName; title: string; description?: string; action?: ReactNode };

export function EmptyState({ icon = "inbox", title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-sunken text-muted">
        <Icon name={icon} size={22} />
      </span>
      <p className="mt-1 font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
