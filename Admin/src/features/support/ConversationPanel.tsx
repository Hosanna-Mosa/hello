/**
 * The conversation: every message, this operator's unconfirmed replies,
 * "user is typing…", and the reply box — or, once resolved, a closed notice.
 *
 * Follows new messages to the bottom only when already at the bottom, so
 * scrolling up to re-read something is not undone by the next reply.
 */

import { useEffect, useLayoutEffect, useRef } from "react";

import { Icon } from "@/components/ui/Icon";
import { MessageItem } from "@/features/support/MessageItem";
import { PendingReplyItem } from "@/features/support/PendingReplyItem";
import { SupportComposer } from "@/features/support/SupportComposer";
import type { PendingReply } from "@/features/support/useSupportTicket";
import type { AdminSupportMessage, AdminSupportTicket } from "@/types/admin";

const NEAR_BOTTOM_PX = 80;

type Props = {
  ticket: AdminSupportTicket;
  messages: AdminSupportMessage[];
  pending: PendingReply[];
  userTyping: boolean;
  myAdminId: string | undefined;
  onSend: (body: string) => void;
  onRetry: (clientMessageId: string) => void;
  onDiscard: (clientMessageId: string) => void;
  onTyping: (isTyping: boolean) => void;
};

export function ConversationPanel(props: Props) {
  const { ticket, messages, pending, userTyping, myAdminId } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const landed = useRef(false);

  useEffect(() => {
    landed.current = false;
  }, [ticket.id]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (!landed.current || atBottom.current) {
      el.scrollTop = el.scrollHeight;
      landed.current = true;
    }
  }, [messages.length, pending.length, userTyping]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
  };

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[28rem] flex-col overflow-hidden rounded-card border border-line bg-canvas shadow-card">
      <div ref={scroller} onScroll={onScroll} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} userName={ticket.user.name} myAdminId={myAdminId} />
        ))}
        {pending.map((p) => (
          <PendingReplyItem
            key={p.clientMessageId}
            reply={p}
            onRetry={() => props.onRetry(p.clientMessageId)}
            onDiscard={() => props.onDiscard(p.clientMessageId)}
          />
        ))}
        {userTyping && (
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-muted" />
            {ticket.user.name} is typing…
          </p>
        )}
      </div>

      {ticket.status === "resolved" ? (
        <div className="flex items-center justify-center gap-2 border-t border-line bg-success-soft p-4 text-sm font-medium text-success">
          <Icon name="check" size={16} /> Resolved and closed by the user. New problems come in as new tickets.
        </div>
      ) : (
        <SupportComposer onSend={props.onSend} onTyping={props.onTyping} />
      )}
    </div>
  );
}
