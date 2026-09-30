/** A reply not yet confirmed by the server — dimmed while sending, with Retry if it failed. */

import { Icon } from "@/components/ui/Icon";
import type { PendingReply } from "@/features/support/useSupportTicket";

type Props = { reply: PendingReply; onRetry: () => void; onDiscard: () => void };

export function PendingReplyItem({ reply, onRetry, onDiscard }: Props) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="px-1 text-xs text-muted">{reply.failed ? "Not sent" : "Sending…"}</span>
      <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-on-primary opacity-60">
        {reply.body}
      </p>
      {reply.failed && (
        <span role="alert" className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-danger">
            <Icon name="alert" size={14} /> Couldn't send
          </span>
          <button type="button" onClick={onRetry} className="font-semibold text-primary-hover hover:underline">
            Retry
          </button>
          <button type="button" onClick={onDiscard} className="text-muted hover:underline">
            Delete
          </button>
        </span>
      )}
    </div>
  );
}
