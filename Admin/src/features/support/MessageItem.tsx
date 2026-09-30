/**
 * One line of a support conversation, from the operator's side: the user on
 * the left, the team on the right, status changes centred.
 *
 * Team replies say who sent them — "You" for this operator, "Support" for a
 * colleague — because several people can answer the same ticket.
 */

import { Icon } from "@/components/ui/Icon";
import { EVENT_LABEL } from "@/features/support/labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AdminSupportMessage } from "@/types/admin";

const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

type Props = { message: AdminSupportMessage; userName: string; myAdminId: string | undefined };

export function MessageItem({ message, userName, myAdminId }: Props) {
  if (message.author === "system") {
    return (
      <div className="flex justify-center py-1" title={formatDateTime(message.createdAt)}>
        <span className="inline-flex max-w-[90%] items-center gap-2 rounded-full bg-sunken px-3 py-1 text-center text-xs font-medium text-muted">
          <Icon name={message.event === "resolutionAccepted" ? "check" : "clock"} size={14} />
          {message.event ? EVENT_LABEL[message.event] : message.body}
        </span>
      </div>
    );
  }

  const team = message.author === "admin";
  const who = team ? (message.adminId && message.adminId === myAdminId ? "You" : "Support") : userName;

  return (
    <div className={cn("flex flex-col gap-1", team ? "items-end" : "items-start")}>
      <span className="px-1 text-xs text-muted">
        {who} · <time dateTime={message.createdAt}>{time.format(new Date(message.createdAt))}</time>
      </span>
      <p
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap",
          team ? "rounded-br-md bg-primary text-on-primary" : "rounded-bl-md border border-line bg-surface text-ink",
        )}
      >
        {message.body}
      </p>
    </div>
  );
}
