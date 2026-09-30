import { useEffect, useState } from "react";

import type { ChatLine } from "@/features/home/chat/chatScript";

const PAUSE_MS = 700;
const TYPING_MS = 1300;
const RESTART_MS = 4500;

/**
 * Plays a chat script one line at a time — pause, "typing…", message — and
 * loops. Runs only while `active` (the phone is on screen).
 */
export function useScriptPlayer(lines: ChatLine[], active: boolean) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState<"me" | "them" | null>(null);

  useEffect(() => {
    if (!active) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    const next = lines[shown];
    if (!next) {
      later(() => setShown(0), RESTART_MS);
    } else {
      if (next.kind === "event") {
        later(() => setShown((s) => s + 1), PAUSE_MS);
      } else {
        later(() => setTyping(next.from), PAUSE_MS);
        later(() => {
          setTyping(null);
          setShown((s) => s + 1);
        }, PAUSE_MS + TYPING_MS);
      }
    }

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active, shown, lines]);

  return { shown, typing: active ? typing : null };
}
