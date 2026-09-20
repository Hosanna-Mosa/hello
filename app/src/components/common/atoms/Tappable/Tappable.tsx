/**
 * `Pressable`.
 *
 * The default for anything interactive. Kept distinct from `Touchable` because
 * the two give different press feedback and that difference is a design
 * decision, not an implementation detail.
 *
 * A11y (A10): every call site supplies `accessibilityRole` and a label, and
 * `hitSlop` should bring the target to at least 44x44.
 */

import { Pressable, type PressableProps } from "react-native";

export type TappableProps = PressableProps;

export function Tappable(props: TappableProps) {
  return <Pressable {...props} />;
}
