/* eslint-disable import/first -- jest.mock calls must be hoisted above the imports they mock. */

/**
 * Render-tree snapshots for chat and calls (PLAN Phase 7).
 *
 * Every state is reached through the real services rather than posed with
 * props: the empty list is an emptied service, "unmatched by them" is a match
 * with an `endedAt`, and the connected call is the screen actually connecting.
 * A snapshot of a hand-built prop bag proves the component renders, not that
 * the app can get there.
 *
 * NOTE on determinism: bubble timestamps are wall-clock, because the fixtures
 * anchor to `Date.now()` at module load, so the thread snapshots go through
 * `redactClockTimes`. Day separators do not need it — the seeded conversation
 * used here is minutes old, so it reads "Today" on any run that does not start
 * within half an hour of midnight.
 */

const mockParams: { id: string; answered?: string } = { id: "thread-1" };

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");

  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: Object.assign(() => null, {
      Screen: () => null,
      Protected: ({ children }: { children: React.ReactNode }) => children,
    }),
  };
});

import CallScreen from "@/app/call/[id]";
import ChatScreen from "@/app/(tabs)/chat";
import IncomingCallScreen from "@/app/incoming-call/[id]";
import ThreadScreen from "@/app/thread/[id]";

import { CallControls } from "@/components/calls/CallControls";
import { IncomingCallActions } from "@/components/calls/IncomingCallActions";
import { formatCallDuration } from "@/components/calls/useCallTimer";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { DaySeparator } from "@/components/chat/DaySeparator";
import { NewMatchesCarousel } from "@/components/chat/NewMatchesCarousel";
import { ReactionPicker } from "@/components/chat/ReactionPicker";
import { RequestRow } from "@/components/chat/RequestRow";
import { SystemMessage } from "@/components/chat/SystemMessage";
import { ThreadMenu } from "@/components/chat/ThreadMenu";
import { ThreadRow } from "@/components/chat/ThreadRow";
import { ThreadSkeleton } from "@/components/chat/ThreadSkeleton";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { CallShell, SegmentedControl } from "@/components/common";

import {
  redactClockTimes,
  renderAtom,
  renderAtomAsync,
  THEMES,
} from "@/components/common/atoms/__tests__/renderAtom";
import { copy } from "@/copy";
import { SEEDED_THREADS } from "@/mocks/threads";
import { callsService } from "@/services/calls.service";
import { chatService } from "@/services/chat.service";
import { billingService } from "@/services/billing.service";
import { configureClient, resetClient } from "@/services/client";
import { likesService } from "@/services/likes.service";
import { matchesService } from "@/services/matches.service";
import { safetyService } from "@/services/safety.service";
import { useChatStore } from "@/stores/chat.store";
import { useEntitlementsStore } from "@/stores/entitlements.store";

const noop = () => {};

beforeEach(() => {
  // Entitlements are global and every surface now reads them: without this a
  // suite that flips premium leaves the next one rendering no ad slots.
  billingService.__reset();
  useEntitlementsStore.setState({ entitlements: null, plans: [], loading: false });
  resetClient();
  configureClient({ minLatencyMs: 0, maxLatencyMs: 0 });
  chatService.__reset();
  matchesService.__reset();
  likesService.__reset();
  callsService.__reset();
  safetyService.__reset();
  useChatStore.setState({
    previews: [],
    requests: [],
    messages: {},
    drafts: {},
    typing: {},
    loading: false,
    error: null,
  });
  mockParams.id = "thread-1";
  mockParams.answered = undefined;
});
afterAll(resetClient);

/** Empty the service for real, rather than emptying the store behind its back. */
async function clearConversations() {
  for (const thread of SEEDED_THREADS) chatService.removeThreadSync(thread.id);
}

async function clearRequests() {
  const pending = await likesService.listRequests("pending");
  await Promise.all(pending.map((request) => likesService.declineRequest(request.id)));
}

describe.each(THEMES)("Phase 7 — conversation list — %s theme", (theme) => {
  it("(tabs)/chat — Messages segment", async () =>
    expect(await renderAtomAsync(<ChatScreen />, theme)).toMatchSnapshot());

  it("(tabs)/chat — no conversations yet", async () => {
    await clearConversations();
    expect(await renderAtomAsync(<ChatScreen />, theme)).toMatchSnapshot();
  });

  it("(tabs)/chat — no pending requests", async () => {
    await clearRequests();
    expect(await renderAtomAsync(<ChatScreen />, theme)).toMatchSnapshot();
  });
});

describe.each(THEMES)("Phase 7 — thread — %s theme", (theme) => {
  it("thread/[id] — a conversation", async () =>
    expect(
      redactClockTimes(await renderAtomAsync(<ThreadScreen />, theme)),
    ).toMatchSnapshot());

  it("thread/[id] — no messages yet", async () => {
    // The seeded match where nobody has said anything.
    mockParams.id = "thread-fresh";
    expect(await renderAtomAsync(<ThreadScreen />, theme)).toMatchSnapshot();
  });

  it("thread/[id] — unmatched by them", async () => {
    // A real ended match, not a posed prop: the thread survives, read-only.
    matchesService.endMatchByThemSync("match-1");
    expect(
      redactClockTimes(await renderAtomAsync(<ThreadScreen />, theme)),
    ).toMatchSnapshot();
  });
});

describe.each(THEMES)("Phase 7 — calls — %s theme", (theme) => {
  it("call/[id] — ringing", async () =>
    expect(await renderAtomAsync(<CallScreen />, theme)).toMatchSnapshot());

  it("call/[id] — connected", async () => {
    // `answered=1` is the path an accepted incoming call takes.
    mockParams.answered = "1";
    expect(await renderAtomAsync(<CallScreen />, theme)).toMatchSnapshot();
  });

  it("call — ended", () =>
    expect(
      renderAtom(
        /*
         * The exact composition `call/[id]` renders once `phase === "ended"`:
         * the status line swaps to "Call ended" and every control but End goes
         * inert. Reaching it needs a button press and a timer, which is a
         * device check (PLAN Phase 7 verification), not a snapshot.
         */
        <CallShell
          name="Maya"
          status={copy.calls.ended}
          controls={
            <CallControls
              muted={false}
              speaker={false}
              disabled
              onToggleMute={noop}
              onToggleSpeaker={noop}
              onEnd={noop}
            />
          }
        >
          <></>
        </CallShell>,
        theme,
      ),
    ).toMatchSnapshot());

  it("incoming-call/[id]", async () =>
    expect(await renderAtomAsync(<IncomingCallScreen />, theme)).toMatchSnapshot());
});

describe.each(THEMES)("Phase 7 — components — %s theme", (theme) => {
  it("SegmentedControl", () =>
    expect(
      renderAtom(
        <SegmentedControl
          segments={[
            { value: "messages", label: copy.chat.segmentMessages },
            { value: "requests", label: copy.chat.segmentRequests, count: 3 },
          ]}
          value="messages"
          onChange={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("ThreadRow — unread", () =>
    expect(
      renderAtom(
        <ThreadRow
          name="Maya"
          snippet="Five hours and a long lunch. Deal."
          lastMessageAt={Date.now() - 8 * 60_000}
          unreadCount={2}
          onPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("ThreadRow — read and muted", () =>
    expect(
      renderAtom(
        <ThreadRow
          name="Daniel"
          snippet="Honestly that's more useful."
          lastMessageAt={Date.now() - 45 * 60_000}
          unreadCount={0}
          muted
          onPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("RequestRow", () =>
    expect(
      renderAtom(
        <RequestRow
          name="Grace"
          age={27}
          note="We matched on three of the same walks — where do you usually start?"
          createdAt={Date.now() - 2 * 60 * 60_000}
          onAccept={noop}
          onDecline={noop}
          onPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("NewMatchesCarousel", () =>
    expect(
      renderAtom(
        <NewMatchesCarousel
          matches={[
            { threadId: "thread-fresh", name: "Yuki" },
            { threadId: "thread-2", name: "Daniel" },
          ]}
          onPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("ChatBubble — sent", () =>
    expect(
      renderAtom(
        <ChatBubble body="That's the one. Four hours at a normal pace." mine timestamp="14:32" />,
        theme,
      ),
    ).toMatchSnapshot());

  it("ChatBubble — received with a reaction", () =>
    expect(
      renderAtom(
        <ChatBubble
          body="I am not a normal pace. Five hours?"
          mine={false}
          timestamp="14:35"
          reactions={[{ emoji: "😄", userId: "user-01" }]}
          onLongPress={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("DaySeparator", () =>
    expect(renderAtom(<DaySeparator label="Yesterday" />, theme)).toMatchSnapshot());

  it("SystemMessage — a finished call", () =>
    expect(
      renderAtom(
        <SystemMessage body={copy.calls.systemRecord(formatCallDuration(134))} />,
        theme,
      ),
    ).toMatchSnapshot());

  it("TypingIndicator", () => expect(renderAtom(<TypingIndicator />, theme)).toMatchSnapshot());

  it("ChatComposer — empty", () =>
    expect(
      renderAtom(<ChatComposer value="" onChangeText={noop} onSend={noop} />, theme),
    ).toMatchSnapshot());

  it("ChatComposer — with a draft", () =>
    expect(
      renderAtom(
        <ChatComposer value="Sounds good, see you then" onChangeText={noop} onSend={noop} />,
        theme,
      ),
    ).toMatchSnapshot());

  it("ReactionPicker", () =>
    expect(
      renderAtom(
        <ReactionPicker visible selected="😄" onSelect={noop} onDismiss={noop} />,
        theme,
      ),
    ).toMatchSnapshot());

  it("ThreadMenu", () =>
    expect(
      renderAtom(
        <ThreadMenu
          visible
          muted={false}
          onDismiss={noop}
          onViewProfile={noop}
          onToggleMute={noop}
          onReport={noop}
          onBlock={noop}
          onUnmatch={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("ThreadSkeleton", () =>
    expect(renderAtom(<ThreadSkeleton count={3} />, theme)).toMatchSnapshot());

  it("CallControls — connected", () =>
    expect(
      renderAtom(
        <CallControls
          muted
          speaker={false}
          onToggleMute={noop}
          onToggleSpeaker={noop}
          onEnd={noop}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("IncomingCallActions", () =>
    expect(
      renderAtom(<IncomingCallActions onAccept={noop} onDecline={noop} />, theme),
    ).toMatchSnapshot());
});

describe("Phase 7 — behaviour", () => {
  it("accepting a request creates a thread seeded with the note (A18)", async () => {
    const [request] = await likesService.listRequests("pending");
    const match = await useChatStore.getState().acceptRequest(request.id);

    const messages = await chatService.listMessages(match.threadId);
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe(request.note);
    // It is their message, not yours — you accepted, you did not write it.
    expect(messages[0].senderId).toBe(request.fromUserId);
  });

  it("declining a request is silent — no thread, no match", async () => {
    const before = await chatService.listThreads();
    const [request] = await likesService.listRequests("pending");

    await useChatStore.getState().declineRequest(request.id);

    expect(await chatService.listThreads()).toHaveLength(before.length);
    expect(await likesService.listRequests("pending")).toHaveLength(2);
  });

  it("unmatching deletes the conversation for good", async () => {
    await useChatStore.getState().loadThreads();
    await useChatStore.getState().unmatch("match-1", "thread-1");

    await expect(chatService.getThread("thread-1")).rejects.toThrow();
    expect(await chatService.listMessages("thread-1")).toHaveLength(0);
    expect(useChatStore.getState().previews.some((p) => p.thread.id === "thread-1")).toBe(false);
  });

  it("a completed call writes one system message, a declined one writes none", async () => {
    const completed = await callsService.startCall("thread-1");
    await callsService.endCall(completed.id, "completed", 134);

    const declined = await callsService.startCall("thread-1");
    await callsService.endCall(declined.id, "declined", 0);

    const system = (await chatService.listMessages("thread-1")).filter(
      (message) => message.kind === "system",
    );
    expect(system).toHaveLength(1);
    expect(system[0].body).toBe("Voice call · 2:14");
  });

  it("formats call durations the way the system message reads them", () => {
    expect(formatCallDuration(0)).toBe("0:00");
    expect(formatCallDuration(7)).toBe("0:07");
    expect(formatCallDuration(134)).toBe("2:14");
    expect(formatCallDuration(3605)).toBe("60:05");
  });
});
