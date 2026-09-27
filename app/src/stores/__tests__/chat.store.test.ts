/**
 * The send race.
 *
 * The server echoes `message:new` to every participant INCLUDING the sender,
 * so their other devices stay in step. That echo and the HTTP response
 * describing the SAME message race each other, and the store must end up with
 * one message whichever wins.
 *
 * It did not. `send` appended unconditionally while only the socket handler
 * deduped, so when the echo arrived first the sender saw their own message
 * twice (PLAN #127). It was invisible until the socket was fixed to deliver
 * anything at all (PLAN #120) — before that, no echo ever arrived.
 */

import { receiveMessage, useChatStore } from "@/stores/chat.store";
import { configureClient, resetClient, setCurrentUserId } from "@/services/client";
import { chatService, type ThreadPreview } from "@/services/chat.service";
import type { Message, Thread } from "@/services/types";

const THREAD = "thread-1";
const ME = "me";

function aMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "message-raced",
    threadId: THREAD,
    senderId: ME,
    kind: "text",
    body: "raced",
    status: "sent",
    reactions: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function aPreview(): ThreadPreview {
  const thread: Thread = {
    id: THREAD,
    matchId: "match-1",
    participantIds: [ME, "user-01"],
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    muted: false,
  };
  return { thread, partnerId: "user-01", lastMessage: null };
}

beforeEach(() => {
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  setCurrentUserId(null); // `currentUserIdOrMe()` falls back to the mock's "me"
  useChatStore.setState({
    previews: [aPreview()],
    requests: [],
    messages: {},
    drafts: {},
    loading: false,
    error: null,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(resetClient);

const bodies = () => (useChatStore.getState().messages[THREAD] ?? []).map((m) => m.body);
const unread = () =>
  useChatStore.getState().previews.find((p) => p.thread.id === THREAD)?.thread.unreadCount ?? 0;

describe("a message the sender also receives back", () => {
  it("appears once when the HTTP response lands first", async () => {
    const echoed = aMessage();
    jest.spyOn(chatService, "sendMessage").mockResolvedValue(echoed);

    await useChatStore.getState().send(THREAD, "raced");
    expect(bodies()).toEqual(["raced"]);

    // The echo arrives afterwards, describing the same message.
    receiveMessage(THREAD, echoed);
    expect(bodies()).toEqual(["raced"]);
  });

  it("appears once when the ECHO lands first — the order that shipped broken", async () => {
    const echoed = aMessage();
    jest.spyOn(chatService, "sendMessage").mockResolvedValue(echoed);

    // The socket wins: the message is in the store before `send` resolves.
    receiveMessage(THREAD, echoed);
    expect(bodies()).toEqual(["raced"]);

    // Now the HTTP response lands with the same message.
    await useChatStore.getState().send(THREAD, "raced");
    expect(bodies()).toEqual(["raced"]);
  });

  it("does not raise your own unread badge", () => {
    // The server bumps only the OTHER participant, so this must agree.
    receiveMessage(THREAD, aMessage({ senderId: ME }));
    expect(unread()).toBe(0);
  });

  it("still raises the badge for a message from the other person", () => {
    receiveMessage(THREAD, aMessage({ id: "message-theirs", senderId: "user-01" }));
    expect(unread()).toBe(1);
  });
});
