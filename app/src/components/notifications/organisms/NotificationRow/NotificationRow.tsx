/**
 * One line in the notifications list: who, what, when.
 *
 * The actor is resolved by the screen, not here — this component never reaches
 * into the mock directory, so the list renders in a test from plain values.
 *
 * `onPress` is optional on purpose: a notification with no deep link is still
 * shown, it just does not navigate. Passing `undefined` leaves `ListRow`
 * unpressable rather than giving it a tap target that does nothing.
 */

import { Avatar, type AvatarSource } from "@/components/common/atoms/Avatar";
import { Caption } from "@/components/common/atoms/Caption";
import { ListRow } from "@/components/common/molecules/ListRow";
import { formatRelativeTime } from "@/components/common/utils/formatRelativeTime";

export type NotificationRowProps = {
  /** Absent for a notification with no actor behind it. */
  actorName?: string;
  /** The actor's preset avatar, when there is an actor at all. */
  actorAvatar?: AvatarSource;
  /** Stands in when there is no actor. */
  fallbackName: string;
  body: string;
  /** Epoch milliseconds. */
  timestamp: number;
  onPress?: () => void;
};

export function NotificationRow({
  actorName,
  actorAvatar,
  fallbackName,
  body,
  timestamp,
  onPress,
}: NotificationRowProps) {
  return (
    <ListRow
      title={actorName ?? fallbackName}
      subtitle={body}
      leading={<Avatar source={actorAvatar} name={actorName} />}
      trailing={<Caption>{formatRelativeTime(timestamp)}</Caption>}
      onPress={onPress}
    />
  );
}
