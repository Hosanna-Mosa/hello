/**
 * `View`, and nothing more.
 *
 * The thinnest possible layer: every prop passes through untouched. It exists
 * so that no screen ever imports `View` directly, which is what keeps the
 * Phase 10 component score at zero and gives us one place to change if the
 * underlying primitive ever moves.
 */

import { View, type ViewProps } from "react-native";

export type BoxProps = ViewProps;

export function Box(props: BoxProps) {
  return <View {...props} />;
}
