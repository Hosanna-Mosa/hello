import { useEffect, useRef } from "react";

import { emitSupportTyping } from "@/services/socket";

/** How long after the last keystroke "typing" is withdrawn. */
const IDLE_MS = 3000;

/**
 * Tell support when the user is typing in this ticket.
 *
 * One `true` when typing starts and one `false` when it stops — after a pause,
 * on sending (the draft empties), or on leaving the screen — never one event
 * per keystroke. No-op in mock mode, where there is no socket.
 */
export function useSupportTyping(ticketId: string, draft: string, enabled: boolean): void {
  const typing = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stop = () => {
      if (idle.current) clearTimeout(idle.current);
      idle.current = null;
      if (typing.current) {
        typing.current = false;
        emitSupportTyping(ticketId, false);
      }
    };

    if (!enabled || draft.trim().length === 0) {
      stop();
      return;
    }

    if (!typing.current) {
      typing.current = true;
      emitSupportTyping(ticketId, true);
    }
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(stop, IDLE_MS);
  }, [ticketId, draft, enabled]);

  // Leaving the screen mid-sentence must not leave "typing…" on the panel.
  useEffect(
    () => () => {
      if (idle.current) clearTimeout(idle.current);
      if (typing.current) emitSupportTyping(ticketId, false);
      typing.current = false;
    },
    [ticketId],
  );
}
