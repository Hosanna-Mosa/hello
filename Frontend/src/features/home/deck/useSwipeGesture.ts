/**
 * Drag-to-decide for the top deck card, with pointer events so mouse, pen
 * and touch all work. Past the threshold the card flies off; short of it the
 * card springs back. `touch-action: pan-y` keeps vertical page scrolling.
 */

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";

export type Direction = "left" | "right";

const THRESHOLD = 110;
const EXIT_MS = 340;

export function useSwipeGesture(onDecide: (dir: Direction) => void) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState<Direction | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const latest = useRef({ x: 0, y: 0 });
  const busy = useRef(false);

  const fling = useCallback(
    (dir: Direction) => {
      if (busy.current) return;
      busy.current = true;
      setExit(dir);
      window.setTimeout(() => {
        onDecide(dir);
        latest.current = { x: 0, y: 0 };
        setDrag({ x: 0, y: 0 });
        setExit(null);
        busy.current = false;
      }, EXIT_MS);
    },
    [onDecide],
  );

  const bind = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (busy.current || e.button > 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      origin.current = { x: e.clientX, y: e.clientY };
      setDragging(true);
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (!origin.current) return;
      latest.current = { x: e.clientX - origin.current.x, y: (e.clientY - origin.current.y) * 0.4 };
      setDrag(latest.current);
    },
    onPointerUp() {
      if (!origin.current) return;
      origin.current = null;
      setDragging(false);
      const { x } = latest.current;
      if (Math.abs(x) > THRESHOLD) fling(x > 0 ? "right" : "left");
      else {
        latest.current = { x: 0, y: 0 };
        setDrag({ x: 0, y: 0 });
      }
    },
  };

  const sign = exit === "right" ? 1 : -1;
  const x = exit ? sign * 560 : drag.x;
  const style: CSSProperties = {
    transform: `translate(${x}px, ${drag.y}px) rotate(${exit ? sign * 28 : drag.x / 14}deg)`,
    transition: dragging ? "none" : "transform 0.4s var(--ease-soft), opacity 0.4s ease",
    opacity: exit ? 0 : 1,
    touchAction: "pan-y",
    cursor: dragging ? "grabbing" : "grab",
  };

  return { bind: { ...bind, onPointerCancel: bind.onPointerUp }, style, dragX: x, fling };
}
