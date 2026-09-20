/**
 * `SectionList`, generic over both the row and the section.
 *
 * Used where rows are grouped under headers: the notifications feed grouped by
 * day, and the grouped settings tree.
 */

import { SectionList, type SectionListProps } from "react-native";

export type SectionedListProps<ItemT, SectionT> = SectionListProps<ItemT, SectionT>;

export function SectionedList<ItemT, SectionT>(
  props: SectionedListProps<ItemT, SectionT>,
) {
  return <SectionList<ItemT, SectionT> {...props} />;
}
