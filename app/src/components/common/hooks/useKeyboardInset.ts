/**
 * How far a bottom-anchored element must be padded to sit above the keyboard,
 * in dp. Zero when the keyboard is closed.
 *
 * Exists because `KeyboardAvoidingView` does not work on the chat thread. It
 * positions by measuring its own frame, and on that screen the measurement
 * never yields a usable inset: the composer stays put and the keyboard draws
 * over it. All three behaviours were tried on a device — `height`, `padding`
 * and none — and every one hid the composer completely.
 *
 * The onboarding form screens are fine with `KeyboardAvoidingView` because
 * their content can compress and push the footer up. A thread cannot: its
 * content is a list, which absorbs any amount of space it is given.
 *
 * Note this is NOT `endCoordinates.height`. Under Android's edge-to-edge mode
 * that height stops at the top of the gesture navigation bar, so padding by it
 * leaves the element short by the nav bar — measured on a Pixel: keyboard top
 * 577.9dp + reported height 312.4dp = 890.3dp against a 914.3dp window, a 24dp
 * shortfall that clipped the composer.
 *
 * Measuring from the window bottom to the keyboard's top edge sidesteps that.
 * It is the distance actually needed, and it stays right whether or not the
 * platform counts the nav bar in `height`.
 *
 * The caller must be anchored to the window bottom — true here, because
 * `ScreenShell` leaves "bottom" out of its safe-area edges.
 *
 * `keyboardDidShow`/`Hide` rather than the `Will` pair: the `Will` events are
 * iOS-only, so `Did` is what fires on both platforms.
 */

import { useEffect, useState } from "react";
import { Dimensions, Keyboard } from "react-native";

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) => {
      // Read the window at event time, so a rotation mid-session is accounted for.
      const windowHeight = Dimensions.get("window").height;
      setInset(Math.max(0, windowHeight - event.endCoordinates.screenY));
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => setInset(0));

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return inset;
}
