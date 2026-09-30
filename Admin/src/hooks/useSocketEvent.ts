/**
 * Subscribe to a live event for as long as the component is mounted.
 *
 * Goes through the registry in `lib/socket.ts`, so it works whether or not
 * the connection exists yet and survives a reconnect. The handler is read
 * through a ref, so an inline function neither resubscribes every render nor
 * runs a stale closure.
 */

import { useEffect, useRef } from "react";

import { onAdminEvent } from "@/lib/socket";

export function useSocketEvent<T>(event: string, handler: (payload: T) => void): void {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => onAdminEvent<T>(event, (payload) => latest.current(payload)), [event]);
}
