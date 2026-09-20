/**
 * Matches — and the thread each one owns.
 *
 * Creating a match always creates its thread, in one step, because a match
 * without a thread is a state the UI has no screen for.
 *
 * Unmatching keeps the `Match` row with an `endedAt` rather than deleting it,
 * so the pair cannot silently resurface in the deck later.
 */

import { SEEDED_MATCHES } from "@/mocks/threads";

import { ApiError, nextId, nowIso, request } from "./client";
import { chatService } from "./chat.service";
import type { Match } from "./types";

const ME = "me";

let matches: Match[] = SEEDED_MATCHES.map((m) => ({ ...m }));

export const matchesService = {
  async listMatches(): Promise<Match[]> {
    return request(() =>
      matches
        .filter((m) => !m.endedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((m) => ({ ...m })),
    );
  },

  /** Used by `likes.service` when a like is reciprocated or a request accepted. */
  createMatchSync(partnerId: string, seedBody?: string): Match {
    const matchId = nextId("match");
    const thread = chatService.createThreadSync(matchId, partnerId, seedBody);

    const match: Match = {
      id: matchId,
      userIds: [ME, partnerId],
      threadId: thread.id,
      createdAt: nowIso(),
      endedAt: null,
    };
    matches = [...matches, match];
    return match;
  },

  async unmatch(matchId: string): Promise<void> {
    return request(() => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) throw new ApiError("notFound");

      matches = matches.map((m) => (m.id === matchId ? { ...m, endedAt: nowIso() } : m));
      // The conversation goes with it — "this can't be undone" is literal.
      chatService.removeThreadSync(match.threadId);
    });
  },

  /**
   * The other side unmatched — mock-only, for the demo and for tests.
   *
   * Deliberately NOT `unmatch`: when *they* end it, your thread survives and
   * goes read-only, because deleting a conversation out from under someone with
   * no explanation is worse than leaving it there greyed out. `unmatch` above
   * is the symmetric case and does remove the thread, which is what
   * "this can't be undone" promises.
   */
  endMatchByThemSync(matchId: string): void {
    matches = matches.map((m) => (m.id === matchId ? { ...m, endedAt: nowIso() } : m));
  },

  async getMatchForThread(threadId: string): Promise<Match | null> {
    return request(() => {
      const match = matches.find((m) => m.threadId === threadId && !m.endedAt);
      return match ? { ...match } : null;
    });
  },

  __reset(): void {
    matches = SEEDED_MATCHES.map((m) => ({ ...m }));
  },
};
