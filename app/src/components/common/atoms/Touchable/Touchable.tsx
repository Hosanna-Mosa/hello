/**
 * `TouchableOpacity`.
 *
 * Deliberately kept alongside `Tappable`: this one dims on press, which is the
 * right feedback for cards and avatars where a background highlight would look
 * heavy. Choosing between them is a design call.
 */

import { TouchableOpacity, type TouchableOpacityProps } from "react-native";

export type TouchableProps = TouchableOpacityProps;

export function Touchable(props: TouchableProps) {
  return <TouchableOpacity {...props} />;
}
