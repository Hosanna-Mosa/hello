/**
 * How much bottom padding a screen-bottom element needs to clear the gesture
 * bar, in dp — and zero while the keyboard is up.
 *
 * `ScreenShell` deliberately leaves "bottom" out of its safe-area edges: the
 * thread's composer is positioned by `useKeyboardInset`, which measures from
 * the WINDOW bottom, and that measurement is only correct if its container
 * actually reaches the window bottom. Adding a bottom edge to the shell would
 * inset the container by the nav bar and make every keyboard offset overshoot
 * by that much.
 *
 * So the inset is applied by the bottom element instead of the shell, which is
 * also what lets the element's own background run to the screen edge rather
 * than leaving a strip of page behind it.
 *
 * Zero while the keyboard is open because the keyboard is drawn OVER the
 * gesture bar — padding for both lifts the composer a nav bar too high.
 */

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKeyboardInset } from "@/components/common/hooks/useKeyboardInset";

export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();

  return keyboardInset > 0 ? 0 : insets.bottom;
}
