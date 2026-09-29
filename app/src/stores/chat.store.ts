/**
 * Conversations and messages.
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
import { currentUserIdOrMe, isMockMode } from "@/services/client";
import { onSocket } from "@/services/socket";
import { likesService } from "@/services/likes.service";
import { matchesService } from "@/services/matches.service";
import type { Match, Message, MessageRequest } from "@/services/types";

export type ChatState = {
  previews: ThreadPreview[];
  requests: MessageRequest[];
  /** Keyed by thread id. */
  messages: Record<string, Message[]>;
  drafts: Record<string, string>;
  loading: boolean;
  error: unknown;

  loadThreads: () => Promise<void>;
  loadRequests: () => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  send: (threadId: string, body: string) => Promise<void>;
  /** A recorded clip at `uri`, `durationSec` long. */
  sendVoice: (threadId: string, uri: string, durationSec: number) => Promise<void>;
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
/**
 * Append a message unless the store already has it.
 *
 * EVERY path in must go through this. The server echoes `message:new` to all
 * participants INCLUDING the sender — deliberately, so the sender's other
 * devices stay in step — which means the socket echo and the HTTP response
 * describing the same message race each other. Appending in both places, as
 * `send` used to, showed the sender their own message twice whenever the echo
 * won (PLAN #127).
 *
 * Identity is the server's message id, so the two copies are recognised as one
 * however they arrive.
 */
function appended(list: Message[], message: Message): Message[] {
  return list.some((m) => m.id === message.id) ? list : [...list, message];
}

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
        [threadId]: appended(state.messages[threadId] ?? [], message),
      },
      previews: withMessage(state.previews, threadId, message, "keep"),
      drafts: { ...state.drafts, [threadId]: "" },
    }));

    // The scripted reply is demo theatre with no server equivalent. Against
    // the real API a message simply sends, and a reply arrives over the socket
    // when an actual person sends one.
    if (!isMockMode()) return;

    // Scripted reply, deterministic per thread and turn.
    const script = chatService.nextReplySync(threadId);
    setTimeout(() => {
      void (async () => {
        const reply = await chatService.receiveReply(threadId, script.body);
        set((state) => ({
          messages: {
            ...state.messages,
            [threadId]: appended(state.messages[threadId] ?? [], reply),
          },
          previews: withMessage(state.previews, threadId, reply, "increment"),
        }));
      })();
    }, script.replyAfterMs);
  },

  sendVoice: async (threadId, uri, durationSec) => {
    const message = await chatService.sendVoice(threadId, uri, durationSec);
    // Same path in as a text message, so the socket echo cannot double it.
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: appended(state.messages[threadId] ?? [], message),
      },
      previews: withMessage(state.previews, threadId, message, "keep"),
    }));
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
        [threadId]: appended(state.messages[threadId] ?? [], message),
      },
      previews: withMessage(state.previews, threadId, message, "keep"),
    }));
  },
}));

/**
 * Live events from the server.
 *
 * Registered once at module load — BEFORE sign-in opens the connection, which
 * is why `onSocket` keeps its own registry and binds on connect rather than
 * subscribing to a socket that does not exist yet. In mock mode the
 * subscription is simply never bound, because nothing ever connects.
 *
 * Every handler is a MERGE, never a replace: an event carries one message and
 * the store may already hold a page of them.
 *
 * Duplicates are handled by `appended`, not by assuming an order. The sender
 * receives their own `message:new` too, and it RACES the HTTP response that
 * describes the same message — either can land first, so both paths dedupe on
 * the server's id.
 */
/**
 * A message arriving from the server.
 *
 * Exported so the race it has to survive can be tested without a live socket —
 * the handler below is a one-line adapter over it.
 */
export function receiveMessage(threadId: string, message: Message): void {
  useChatStore.setState((state) => {
    const existing = state.messages[threadId] ?? [];
    const next = appended(existing, message);
    if (next === existing) return state;

    // Your own message, echoed back to keep your other devices in step, must
    // not raise your OWN unread badge. The server does not count it either —
    // it bumps only the other participant — so incrementing here would put the
    // badge out of step with the server until the next refresh.
    const mine = message.senderId === currentUserIdOrMe();

    return {
      messages: { ...state.messages, [threadId]: next },
      previews: withMessage(state.previews, threadId, message, mine ? "keep" : "increment"),
    };
  });
}

onSocket("message:new", ({ threadId, message }) => receiveMessage(threadId, message));

onSocket("message:reaction", ({ threadId, messageId, reactions }) => {
  useChatStore.setState((state) => ({
    messages: {
      ...state.messages,
      [threadId]: (state.messages[threadId] ?? []).map((m) =>
        m.id === messageId ? { ...m, reactions } : m,
      ),
    },
  }));
});

onSocket("thread:receipt", ({ threadId }) => {
  // One receipt covers the whole cursor move, so the cheapest correct response
  // is to re-read the thread rather than guess which messages it covered.
  void useChatStore.getState().loadMessages(threadId);
});

onSocket("thread:ended", ({ threadId }) => {
  useChatStore.setState((state) => {
    const { [threadId]: _dropped, ...messages } = state.messages;
    return {
      messages,
      previews: state.previews.filter((p) => p.thread.id !== threadId),
    };
  });
});
