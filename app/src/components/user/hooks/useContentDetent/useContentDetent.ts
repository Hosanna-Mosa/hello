/**
 * Size a form sheet's detent to what is in it.
 *
 * The profile sheet opened at a fixed 70%, so a short profile (no bio, a few
 * interests) left a large empty band under the action (operator screenshot).
 * Native `fitToContents` would be the obvious answer, but on SDK 54 Android it
 * measures before the content has laid out and opens short (PLAN #236).
 *
 * So the measuring happens here, AFTER layout: `SheetShell` reports its natural
 * height, and this turns it into a fraction of the window for
 * `sheetAllowedDetents`. Capped at `max`, where the scroller takes over.
 */

import { useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ContentDetent = {
  /** The detent to apply, or null until the content has been measured. */
  detent: number | null;
  /** Pass to `SheetShell`'s `onNaturalHeight`. */
  onNaturalHeight: (height: number) => void;
};

export function useContentDetent(max = 0.9): ContentDetent {
  const { height: windowHeight } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const [detent, setDetent] = useState<number | null>(null);
  const last = useRef<number | null>(null);

  const onNaturalHeight = (height: number) => {
    if (!windowHeight) return;
    // Round UP to a whole percent: a sheet a hair too short clips the button.
    const next = Math.min(max, Math.ceil(((height + bottom) / windowHeight) * 100) / 100);
    // Layout reports the same size repeatedly; only a real change resizes.
    if (last.current !== null && Math.abs(next - last.current) < 0.01) return;
    last.current = next;
    setDetent(next);
  };

  return { detent, onNaturalHeight };
}
