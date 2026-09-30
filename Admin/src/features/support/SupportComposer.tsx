/**
 * The reply box. Enter sends, Shift+Enter is a new line — the chat convention
 * operators expect. Tells the user "support is typing…" once when typing
 * starts and once when it stops, never per keystroke.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const MAX = 2000;
const IDLE_MS = 3000;

type Props = { onSend: (body: string) => void; onTyping: (isTyping: boolean) => void };

export function SupportComposer({ onSend, onTyping }: Props) {
  const [value, setValue] = useState("");
  const typing = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = () => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = null;
    if (typing.current) {
      typing.current = false;
      onTyping(false);
    }
  };

  // Leaving mid-sentence must not leave "typing…" on the user's phone.
  useEffect(() => stopTyping, []);

  const change = (next: string) => {
    setValue(next);
    if (!next.trim()) return stopTyping();
    if (!typing.current) {
      typing.current = true;
      onTyping(true);
    }
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(stopTyping, IDLE_MS);
  };

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    stopTyping();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-line bg-surface p-3">
      <textarea
        aria-label="Reply to the user"
        value={value}
        onChange={(e) => change(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Write a reply…  (Enter to send, Shift+Enter for a new line)"
        maxLength={MAX}
        rows={2}
        className="max-h-40 min-h-11 flex-1 resize-y rounded-control border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
      />
      <Button onClick={submit} disabled={!value.trim()} icon={<Icon name="send" size={16} />}>
        Send
      </Button>
    </div>
  );
}
