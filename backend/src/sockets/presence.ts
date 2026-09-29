/**
 * How many live sockets a user has right now — for logs, never for logic.
 *
 * The single most useful fact when a call "does nothing": if the callee has 0
 * sockets, the ring went nowhere, and no amount of WebRTC debugging will help.
 * Works across processes through the Redis adapter.
 */

import { getIo } from "@/sockets/io.js";
import { userRoom } from "@/sockets/rooms.js";

export async function socketsOnline(userId: string): Promise<number> {
  const io = getIo();
  if (!io) return 0;
  try {
    return (await io.in(userRoom(userId)).fetchSockets()).length;
  } catch {
    return -1;
  }
}
