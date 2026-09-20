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

import { ApiError, nextId, nowIso, request } from "./client";
import type { Message, Thread } from "./types";

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

export const chatService = {
  async listThreads(): Promise<Thread[]> {
    return request(() => sortedThreads().map((t) => ({ ...t })));
  },

  async listThreadPreviews(): Promise<ThreadPreview[]> {
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
    return request(() => {
      const thread = threads.find((t) => t.id === id);
      if (!thread) throw new ApiError("notFound");
      return { ...thread };
    });
  },

  async listMessages(threadId: string): Promise<Message[]> {
    return request(() =>
      messages
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((m) => ({ ...m })),
    );
  },

  async sendMessage(threadId: string, body: string): Promise<Message> {
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
    return request(() => {
      threads = threads.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t));
    });
  },

  async setMuted(threadId: string, muted: boolean): Promise<Thread> {
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
