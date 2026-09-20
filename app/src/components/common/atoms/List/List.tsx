/**
 * `FlatList`, generic over the row type.
 *
 * The generic matters: it keeps `renderItem` fully typed at every call site,
 * so a profile list cannot silently render a message row.
 */

import type { Ref } from "react";
import { FlatList, type FlatListProps } from "react-native";

export type ListHandle<ItemT> = FlatList<ItemT>;

export type ListProps<ItemT> = FlatListProps<ItemT> & {
  /**
   * Forwarded to the underlying list.
   *
   * Needed because a chat thread has to scroll itself to the newest message
   * after a send, and there is no declarative way to say that. Same reasoning
   * as `BareInput`'s ref: without it the screen would have to import the bare
   * primitive, which the lint guard (rightly) forbids.
   */
  ref?: Ref<FlatList<ItemT>>;
};

export function List<ItemT>({ ref, ...rest }: ListProps<ItemT>) {
  return <FlatList<ItemT> ref={ref} {...rest} />;
}
