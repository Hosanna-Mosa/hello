/**
 * The number on the Home bell.
 *
 * Re-read on every focus, not once on mount: Home is a tab and stays mounted,
 * so coming back from the feed — which marks everything read — must clear the
 * badge, and coming back from anywhere else should pick up what arrived since.
 *
 * A failed count reads as zero. A missing badge is a smaller lie than an error
 * state over the whole Home screen for a number in the corner.
 */

import { useCallback, useState } from "react";

import { useFocusLoad } from "@/components/common/hooks/useFocusLoad";
import { notificationsService } from "@/services/notifications.service";

export function useUnreadActivity(): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setCount(await notificationsService.unreadCount());
    } catch {
      setCount(0);
    }
  }, []);

  useFocusLoad(load);

  return count;
}
