/**
 * Threads and messages.
 *
 * A leaf as far as other services go — `matches.service` calls in here to
 * create a thread, never the other way round, which keeps the graph acyclic.
 *
 * The match gate is structural: there is no way to create a thread without a
 * `matchId`, so open messaging cannot happen by accident.
 */

import { replyFor, type ReplyScript } from "@/mocks/replies";
import { SEEDED_MESSAGES, SEEDED_THREADS } from "@/mocks/threads";

import { ApiError, nextId, nowIso, request, isMockMode, http, currentUserIdOrMe, upload } from "./client";
import type { Message, Paginated, Thread } from "./types";

/**
 * A conversation as the list needs it: the thread, who it is with, and the
 * last thing said.
 *
 * One call rather than `listThreads()` followed by `listMessages()` per row —
 * which is N+1 against a mock service today and against a real one later.
 */
export type ThreadPreview = {
  thread: Thread;
  partnerId: string;
  /** Null for a match where nobody has said anything yet. */
  lastMessage: Message | null;
};

const ME = "me";

let threads: Thread[] = SEEDED_THREADS.map((t) => ({ ...t }));
let messages: Message[] = SEEDED_MESSAGES.map((m) => ({ ...m }));
/** How many replies a thread has already produced, for deterministic scripting. */
let replyTurns = new Map<string, number>();

function sortedThreads(): Thread[] {
  return [...threads].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}


/**
 * Threads are on the backend from Phase 5.
 *
 * What is still local: the SCRIPTED REPLY. `nextReplySync` and the typing
 * delay are pure demo theatre with no server equivalent — a real conversation
 * needs a second human, or the socket channel that lands in Phase 6. Against
 * the real API a sent message simply sends, and nothing answers back.
 */
export const chatService = {
  async listThreads(): Promise<Thread[]> {
    if (!isMockMode()) return http<Thread[]>("GET", "/threads");

    return request(() => sortedThreads().map((t) => ({ ...t })));
  },

  async listThreadPreviews(): Promise<ThreadPreview[]> {
    if (!isMockMode()) {
      // The server denormalises `lastMessage` onto the thread, so the list is
      // one request rather than one per row — the N+1 the app's own comment
      // flagged.
      const threads = await http<Thread[]>("GET", "/threads");
      return threads.map((thread) => ({
        thread,
        partnerId: thread.participantIds.find((id) => id !== currentUserIdOrMe()) ?? "",
        // The server denormalises this so the list is one request. Hardcoding
        // null here — as this did — made EVERY thread look like a match with
        // nothing said yet, so the Chat tab filed all of them under "New
        // matches" and showed no conversations at all.
        lastMessage: thread.lastMessage ?? null,
      }));
    }

    return request(() =>
      sortedThreads().map((thread) => {
        const conversation = messages
          .filter((m) => m.threadId === thread.id)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
          thread: { ...thread },
          partnerId: thread.participantIds.find((id) => id !== ME) ?? ME,
          lastMessage: conversation.length
            ? { ...conversation[conversation.length - 1] }
            : null,
        };
      }),
    );
  },

  async getThread(id: string): Promise<Thread> {
    if (!isMockMode()) {
      const threads = await http<Thread[]>("GET", "/threads");
      const found = threads.find((t) => t.id === id);
      if (!found) throw new ApiError("notFound");
      return found;
    }

    return request(() => {
      const thread = threads.find((t) => t.id === id);
      if (!thread) throw new ApiError("notFound");
      return { ...thread };
    });
  },

  async listMessages(threadId: string): Promise<Message[]> {
    if (!isMockMode()) {
      // The server pages newest-first because a chat opens at the bottom; the
      // UI renders oldest-first, so reverse here rather than in every screen.
      const page = await http<Paginated<Message>>("GET", `/threads/${encodeURIComponent(threadId)}/messages`);
      return [...page.items].reverse();
    }

    return request(() =>
      messages
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((m) => ({ ...m })),
    );
  },

  async sendMessage(threadId: string, body: string): Promise<Message> {
    if (!isMockMode()) {
      // A client id makes a retry idempotent: a phone that never saw the
      // response gets the original message back rather than posting twice.
      return http<Message>("POST", `/threads/${encodeURIComponent(threadId)}/messages`, {
        body,
        clientMessageId: nextId("cm"),
      });
    }

    return request(() => {
      const trimmed = body.trim();
      if (!trimmed) throw new ApiError("validation", "Message cannot be empty");
      if (!threads.some((t) => t.id === threadId)) throw new ApiError("notFound");

      const message: Message = {
        id: nextId("message"),
        threadId,
        senderId: ME,
        kind: "text",
        body: trimmed,
        status: "sent",
        reactions: [],
        createdAt: nowIso(),
      };

      messages = [...messages, message];
      threads = threads.map((t) =>
        t.id === threadId ? { ...t, lastMessageAt: message.createdAt } : t,
      );

      return { ...message };
    });
  },

  /**
   * Send a recorded voice message. `uri` is the local file the recorder wrote.
   *
   * Real mode uploads the raw audio; the server stores it and answers with the
   * message, whose `voice.url` is the gated stream. Mock mode keeps the local
   * file as the url, so the demo plays back what was just recorded.
   */
  async sendVoice(threadId: string, uri: string, durationSec: number): Promise<Message> {
    const seconds = Math.round(durationSec * 10) / 10;

    if (!isMockMode()) {
      // React Native's fetch reads a `file://` uri into a Blob without any
      // file-system library.
      const audio = await (await fetch(uri)).blob();
      const query = `durationSec=${seconds}&clientMessageId=${encodeURIComponent(nextId("vm"))}`;
      return upload<Message>(
        `/threads/${encodeURIComponent(threadId)}/voice?${query}`,
        audio,
        "audio/mp4",
      );
    }

    return request(() => {
      if (!threads.some((t) => t.id === threadId)) throw new ApiError("notFound");

      const message: Message = {
        id: nextId("message"),
        threadId,
        senderId: ME,
        kind: "voice",
        body: "Voice message",
        voice: { url: uri, durationSec: seconds },
        status: "sent",
        reactions: [],
        createdAt: nowIso(),
      };

      messages = [...messages, message];
      threads = threads.map((t) =>
        t.id === threadId ? { ...t, lastMessageAt: message.createdAt } : t,
      );

      return { ...message };
    });
  },

  /** The scripted reply for this thread's next turn, plus its typing delay. */
  nextReplySync(threadId: string): ReplyScript {
    const turn = replyTurns.get(threadId) ?? 0;
    replyTurns.set(threadId, turn + 1);
    return replyFor(threadId, turn);
  },

  /** Lands an inbound scripted reply. Phase 7 calls this after the typing delay. */
  async receiveReply(threadId: string, body: string): Promise<Message> {
    return request(() => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) throw new ApiError("notFound");

      const partnerId = thread.participantIds.find((id) => id !== ME) ?? ME;
      const message: Message = {
        id: nextId("message"),
        threadId,
        senderId: partnerId,
        kind: "text",
        body,
        status: "delivered",
        reactions: [],
        createdAt: nowIso(),
      };

      messages = [...messages, message];
      threads = threads.map((t) =>
        t.id === threadId
          ? { ...t, lastMessageAt: message.createdAt, unreadCount: t.unreadCount + 1 }
          : t,
      );
      return { ...message };
    });
  },

  async toggleReaction(messageId: string, emoji: string): Promise<Message> {
    if (!isMockMode()) {
      return http<Message>("POST", `/messages/${encodeURIComponent(messageId)}/reactions`, { emoji });
    }

    return request(() => {
      const target = messages.find((m) => m.id === messageId);
      if (!target) throw new ApiError("notFound");

      const mine = target.reactions.find((r) => r.userId === ME);
      const reactions =
        mine?.emoji === emoji
          ? target.reactions.filter((r) => r.userId !== ME)
          : [...target.reactions.filter((r) => r.userId !== ME), { emoji, userId: ME }];

      const updated = { ...target, reactions };
      messages = messages.map((m) => (m.id === messageId ? updated : m));
      return { ...updated };
    });
  },

  async markRead(threadId: string): Promise<void> {
    if (!isMockMode()) return http<void>("POST", `/threads/${encodeURIComponent(threadId)}/read`);

    return request(() => {
      threads = threads.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t));
    });
  },

  async setMuted(threadId: string, muted: boolean): Promise<Thread> {
    if (!isMockMode()) return http<Thread>("PATCH", `/threads/${encodeURIComponent(threadId)}`, { muted });

    return request(() => {
      const updated = threads.find((t) => t.id === threadId);
      if (!updated) throw new ApiError("notFound");
      const next = { ...updated, muted };
      threads = threads.map((t) => (t.id === threadId ? next : t));
      return { ...next };
    });
  },

  /**
   * Creates a thread for a match. `seedBody` is the note from an accepted
   * message request, which becomes the conversation's first message (A18).
   */
  createThreadSync(matchId: string, partnerId: string, seedBody?: string): Thread {
    const thread: Thread = {
      id: nextId("thread"),
      matchId,
      participantIds: [ME, partnerId],
      lastMessageAt: nowIso(),
      unreadCount: seedBody ? 1 : 0,
      muted: false,
    };
    threads = [...threads, thread];

    if (seedBody) {
      messages = [
        ...messages,
        {
          id: nextId("message"),
          threadId: thread.id,
          senderId: partnerId,
          kind: "text",
          body: seedBody,
          status: "delivered",
          reactions: [],
          createdAt: thread.lastMessageAt,
        },
      ];
    }

    return thread;
  },

  /** Writes "Voice call · 2:14" back into the thread when a call ends. */
  appendSystemMessageSync(threadId: string, body: string): Message {
    const message: Message = {
      id: nextId("message"),
      threadId,
      senderId: ME,
      kind: "system",
      body,
      status: "sent",
      reactions: [],
      createdAt: nowIso(),
    };
    messages = [...messages, message];
    threads = threads.map((t) =>
      t.id === threadId ? { ...t, lastMessageAt: message.createdAt } : t,
    );
    return message;
  },

  removeThreadSync(threadId: string): void {
    threads = threads.filter((t) => t.id !== threadId);
    messages = messages.filter((m) => m.threadId !== threadId);
  },

  __reset(): void {
    threads = SEEDED_THREADS.map((t) => ({ ...t }));
    messages = SEEDED_MESSAGES.map((m) => ({ ...m }));
    replyTurns = new Map();
  },
};
