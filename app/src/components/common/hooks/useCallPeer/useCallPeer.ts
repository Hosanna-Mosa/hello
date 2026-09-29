/**
 * The other person on a thread's call — name and avatar.
 *
 * Asks who "me" is rather than assuming the mock's literal: against the real
 * API the id is a Mongo id, and a hardcoded "me" matches nobody.
 */

import { useEffect, useState } from "react";

import { avatarSource } from "@/mocks/avatars";
import { chatService } from "@/services/chat.service";
import { currentUserIdOrMe } from "@/services/client";
import { profilesService } from "@/services/profiles.service";

export type CallPeer = { name: string; avatar: number | undefined };

export function useCallPeer(threadId: string | null | undefined): CallPeer {
  const [peer, setPeer] = useState<CallPeer>({ name: "", avatar: undefined });

  useEffect(() => {
    if (!threadId) return undefined;
    let cancelled = false;

    void (async () => {
      try {
        const thread = await chatService.getThread(threadId);
        const viewerId = currentUserIdOrMe();
        const partnerId = thread.participantIds.find((each) => each !== viewerId) ?? viewerId;
        const profile = await profilesService.getProfile(partnerId);
        if (!cancelled) setPeer({ name: profile.name, avatar: avatarSource(profile.avatarId) });
      } catch {
        // The strip works without a name; it just says "Incoming call".
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  return peer;
}
