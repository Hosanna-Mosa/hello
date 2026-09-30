import { useSyncExternalStore } from "react";

import { onSocketStatus, socketStatus, type SocketStatus } from "@/lib/socket";

/** Whether the live connection is up — for the "Live" indicator. */
export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(onSocketStatus, socketStatus, () => "offline");
}
