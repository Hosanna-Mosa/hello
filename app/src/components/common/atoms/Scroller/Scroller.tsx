/**
 * `ScrollView`.
 *
 * `contentContainerStyle` is passed straight through — it is the prop most
 * often needed on a scroller and swallowing it would force screens back to the
 * bare primitive.
 */

import { ScrollView, type ScrollViewProps } from "react-native";

export type ScrollerProps = ScrollViewProps;

export function Scroller(props: ScrollerProps) {
  return <ScrollView {...props} />;
}
