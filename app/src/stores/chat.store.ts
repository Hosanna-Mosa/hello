/**
 * Conversations, messages and the typing indicator.
 *
 * The list holds `ThreadPreview`s rather than bare `Thread`s: a conversation
 * row needs the last thing said, and fetching that per row is N+1 against the
 * mock service today and against a real one later.
 *
 * Drafts are kept per thread so switching conversations and coming back does
 * not lose what was half-written — cheap to do here, and very noticeable when
 * it is missing.
 */

import { create } from "zustand";

import { chatService, type ThreadPreview } from "@/services/chat.service";
import { likesService } from "@/services/likes.service";
import { matchesService } from "@/services/matches.service";
import type { Match, Message, MessageRequest } from "@/services/types";

export type ChatState = {
  previews: ThreadPreview[];
  requests: MessageRequest[];
  /** Keyed by thread id. */
  messages: Record<string, Message[]>;
  drafts: Record<string, string>;
  /** Thread ids where the other person is "typing". */
  typing: Record<string, boolean>;
  loading: boolean;
  error: unknown;

  loadThreads: () => Promise<void>;
  loadRequests: () => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  send: (threadId: string, body: string) => Promise<void>;
  toggleReaction: (threadId: string, messageId: string, emoji: string) => Promise<void>;
  markRead: (threadId: string) => Promise<void>;
  setDraft: (threadId: string, draft: string) => void;
  acceptRequest: (requestId: string) => Promise<Match>;
  declineRequest: (requestId: string) => Promise<void>;
  setMuted: (threadId: string, muted: boolean) => Promise<void>;
  unmatch: (matchId: string, threadId: string) => Promise<void>;
  appendSystemMessage: (threadId: string, body: string) => void;
};

/**
 * Fold a new message into the list previews and re-sort.
 *
 * Returns a new array every time — never mutates the previews in place, which
 * React Compiler would not forgive (AGENTS.md: "never mutate objects/arrays in
 * place" is the #1 breakage).
 */
function withMessage(
  previews: ThreadPreview[],
  threadId: string,
  message: Message,
  unread: "keep" | "increment",
): ThreadPreview[] {
  return [...previews]
    .map((preview) =>
      preview.thread.id === threadId
        ? {
            ...preview,
            thread: {
              ...preview.thread,
              lastMessageAt: message.createdAt,
              unreadCount:
                unread === "increment"
                  ? preview.thread.unreadCount + 1
                  : preview.thread.unreadCount,
            },
            lastMessage: message,
          }
        : preview,
    )
    .sort(
      (a, b) =>
        new Date(b.thread.lastMessageAt).getTime() -
        new Date(a.thread.lastMessageAt).getTime(),
    );
}

export const useChatStore = create<ChatState>((set, get) => ({
  previews: [],
  requests: [],
  messages: {},
  drafts: {},
  typing: {},
  loading: false,
  error: null,

  loadThreads: async () => {
    set({ loading: true, error: null });
    try {
      set({ previews: await chatService.listThreadPreviews() });
    } catch (error) {
      set({ error });
    } finally {
      set({ loading: false });
    }
  },

  loadRequests: async () => {
    set({ requests: await likesService.listRequests("pending") });
  },

  loadMessages: async (threadId) => {
    const list = await chatService.listMessages(threadId);
    set((state) => ({ messages: { ...state.messages, [threadId]: list } }));
  },

  send: async (threadId, body) => {
    const message = await chatService.sendMessage(threadId, body);

    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: [...(state.messages[threadId] ?? []), message],
      },
      previews: withMessage(state.previews, threadId, message, "keep"),
      drafts: { ...state.drafts, [threadId]: "" },
      typing: { ...state.typing, [threadId]: true },
    }));

    // Scripted reply, deterministic per thread and turn.
    const script = chatService.nextReplySync(threadId);
    setTimeout(() => {
      void (async () => {
        const reply = await chatService.receiveReply(threadId, script.body);
        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: [...(state.messages[threadId] ?? []), reply],
          },
          previews: withMessage(state.previews, threadId, reply, "increment"),
          typing: { ...state.typing, [threadId]: false },
        }));
      })();
    }, script.typingMs);
  },

  toggleReaction: async (threadId, messageId, emoji) => {
    const updated = await chatService.toggleReaction(messageId, emoji);
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: (state.messages[threadId] ?? []).map((m) =>
          m.id === messageId ? updated : m,
        ),
      },
    }));
  },

  markRead: async (threadId) => {
    await chatService.markRead(threadId);
    set((state) => ({
      previews: state.previews.map((preview) =>
        preview.thread.id === threadId
          ? { ...preview, thread: { ...preview.thread, unreadCount: 0 } }
          : preview,
      ),
    }));
  },

  setDraft: (threadId, draft) =>
    set((state) => ({ drafts: { ...state.drafts, [threadId]: draft } })),

  acceptRequest: async (requestId) => {
    const match = await likesService.acceptRequest(requestId);
    // Refresh both: accepting removes a request AND adds a thread.
    await get().loadRequests();
    await get().loadThreads();
    return match;
  },

  declineRequest: async (requestId) => {
    await likesService.declineRequest(requestId);
    await get().loadRequests();
  },

  setMuted: async (threadId, muted) => {
    const updated = await chatService.setMuted(threadId, muted);
    set((state) => ({
      previews: state.previews.map((preview) =>
        preview.thread.id === threadId ? { ...preview, thread: updated } : preview,
      ),
    }));
  },

  /**
   * Unmatching deletes the conversation for both sides, so the thread and its
   * messages are dropped rather than marked ended. Leaving them cached would
   * let an already-mounted list keep rendering a thread the service no longer
   * has — which is exactly what happens when you unmatch and press back.
   */
  unmatch: async (matchId, threadId) => {
    await matchesService.unmatch(matchId);
    set((state) => {
      const messages = { ...state.messages };
      delete messages[threadId];
      const drafts = { ...state.drafts };
      delete drafts[threadId];

      return {
        previews: state.previews.filter((preview) => preview.thread.id !== threadId),
        messages,
        drafts,
      };
    });
  },

  /** The "Voice call · 2:14" line a finished call leaves behind (A17). */
  appendSystemMessage: (threadId, body) => {
    const message = chatService.appendSystemMessageSync(threadId, body);
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: [...(state.messages[threadId] ?? []), message],
      },
      previews: withMessage(state.previews, threadId, message, "keep"),
    }));
  },
}));
