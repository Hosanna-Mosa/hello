import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Body,
  Caption,
  Box,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  List,
  type ListHandle,
  type ListProps,
  ScreenShell,
  formatClockTime,
  formatDayLabel,
  isNewDay,
  useBottomInset,
  useKeyboardInset,
  useTheme,
} from "@/components/common";
import { useComposerVoice } from "@/components/thread/hooks/useComposerVoice";
import { ChatBubble } from "@/components/common/molecules/ChatBubble";
import { ChatComposer } from "@/components/common/organisms/ChatComposer";
import { DaySeparator } from "@/components/common/molecules/DaySeparator";
import { ReactionPicker } from "@/components/thread/molecules/ReactionPicker";
import { SystemMessage } from "@/components/common/molecules/SystemMessage";
import { ThreadActions } from "@/components/thread/molecules/ThreadActions";
import { ThreadHeader } from "@/components/thread/molecules/ThreadHeader";
import { ThreadMenu } from "@/components/thread/organisms/ThreadMenu";
import { VoiceBubble } from "@/components/thread/organisms/VoiceBubble";
import { ThreadSkeleton } from "@/components/common/molecules/ThreadSkeleton";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { currentUserIdOrMe } from "@/services/client";
import { chatService } from "@/services/chat.service";
import { matchesService } from "@/services/matches.service";
import { profilesService } from "@/services/profiles.service";
import { safetyService } from "@/services/safety.service";
import type { Message, PublicProfile, Thread } from "@/services/types";
import { useChatStore } from "@/stores/chat.store";
import { subscribeThread, unsubscribeThread } from "@/services/socket";


/**
 * One shared empty array for a thread with nothing loaded yet.
 *
 * `state.messages[id] ?? []` looks harmless and is not: the literal is a new
 * array on every call, so `useSyncExternalStore` never sees a stable snapshot
 * and React re-renders forever ("The result of getSnapshot should be cached").
 */
const NO_MESSAGES: Message[] = [];

/**
 * How close to the bottom still counts as "reading the newest", in dp.
 *
 * Someone who has scrolled up to find something must not be yanked back down
 * when a message lands. But someone a few pixels off the bottom plainly is at
 * the bottom, and an exact comparison would fail them on every rubber-band
 * bounce.
 */
const NEAR_BOTTOM_DP = 80;

/**
 * Marking a thread read is fire-and-forget.
 *
 * It changes a badge, not the conversation. Letting it reject unhandled warns
 * in dev and tells the reader nothing; letting it reach the error state would
 * replace a conversation that loaded perfectly well with "something went
 * wrong". The badge simply clears on the next successful open.
 */
function ignoreReadFailure(): void {}

/** A day separator or a message — the list renders one flat array of both. */
type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: Message };

/**
 * Interleave day separators into a chronological message list.
 *
 * Done here rather than with a section list because a chat has no sticky
 * headers and no per-section behaviour — the separators are just rows that
 * happen to say what day it is.
 */
function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = [];
  let previous: number | null = null;

  for (const message of messages) {
    const at = new Date(message.createdAt).getTime();

    if (previous === null || isNewDay(previous, at)) {
      rows.push({ kind: "day", key: `day-${message.id}`, label: formatDayLabel(at) });
    }

    rows.push({ kind: "message", key: message.id, message });
    previous = at;
  }

  return rows;
}

/**
 * One conversation.
 *
 * Three things can be true here that the composer must respect: the thread is
 * live, the other person unmatched you, or you unmatched them (in which case
 * this screen is gone and you are back on the list). The middle case keeps the
 * conversation readable and takes the composer away — silently dropping sends
 * would be worse than saying why.
 */
export default function ThreadScreen() {
  const theme = useTheme();
  const keyboardInset = useKeyboardInset();
  const bottomInset = useBottomInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listRef = useRef<ListHandle<Row>>(null);

  /**
   * Who "me" is, asked rather than assumed.
   *
   * This was the literal `"me"` — the mock's own id for the signed-in user.
   * Against the real API the id is a Mongo id, so "the participant who is not
   * me" matched NOBODY and fell back to the first participant: both people saw
   * the same name in the header, and every message rendered as incoming on
   * both phones.
   */
  const viewerId = currentUserIdOrMe();

  const messages = useChatStore((state) => state.messages[id] ?? NO_MESSAGES);
  const draft = useChatStore((state) => state.drafts[id] ?? "");

  /**
   * Join this conversation's room for as long as the screen is open.
   *
   * The room carries live messages for the conversation on screen, so it is
   * joined on mount and left on unmount. No-op in mock mode.
   */
  useEffect(() => {
    subscribeThread(id);
    return () => unsubscribeThread(id);
  }, [id]);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const setDraft = useChatStore((state) => state.setDraft);
  const send = useChatStore((state) => state.send);
  const toggleReaction = useChatStore((state) => state.toggleReaction);
  const markRead = useChatStore((state) => state.markRead);
  const setMuted = useChatStore((state) => state.setMuted);
  const unmatch = useChatStore((state) => state.unmatch);

  const [thread, setThread] = useState<Thread | null>(null);
  const [partner, setPartner] = useState<PublicProfile | null>(null);
  /** False once the other side has unmatched — the thread survives, read-only. */
  const [active, setActive] = useState(true);
  /**
   * Only skeleton a conversation we do not already have.
   *
   * A LAZY initialiser, so the store is read once at mount and never again —
   * the flag must not flip to false the instant the first message arrives. The
   * store keeps messages per thread and the socket keeps appending to them
   * while you are somewhere else, so reopening a conversation you have already
   * read finds them ALREADY THERE, and covering them with a skeleton is a
   * loading state for work that is not needed. The refresh still runs; it just
   * stops blanking the screen while it does.
   */
  const [loading, setLoading] = useState(() => messages.length === 0);
  const [error, setError] = useState<unknown>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reactingTo, setReactingTo] = useState<Message | null>(null);
  const [confirm, setConfirm] = useState<"unmatch" | "block" | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const loaded = await chatService.getThread(id);
        const partnerId = loaded.participantIds.find((each) => each !== viewerId) ?? viewerId;

        const [profile, match] = await Promise.all([
          profilesService.getProfile(partnerId),
          matchesService.getMatchForThread(id),
        ]);
        await loadMessages(id);
        // Best effort, and deliberately not awaited: clearing the unread badge
        // is not worth an error screen over a conversation that loaded fine.
        void markRead(id).catch(ignoreReadFailure);

        if (cancelled) return;
        setThread(loaded);
        setPartner(profile);
        setActive(match !== null);
      } catch (caught) {
        if (!cancelled) setError(caught);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, loadMessages, markRead, viewerId]);

  // A scripted reply arriving while the thread is open must not leave an unread
  // badge behind on the list.
  useEffect(() => {
    if (!loading && messages.length > 0) void markRead(id).catch(ignoreReadFailure);
  }, [id, loading, markRead, messages.length]);

  /** False until the list has been placed at the newest message once. */
  /** Latched while a call screen is opening, so one tap cannot open two. */
  const callOpening = useRef(false);
  /**
   * Re-armed when this screen comes back into focus — which is exactly when
   * calling again becomes possible, and unlike a timer it cannot re-arm while
   * the call screen is still up.
   */
  useFocusEffect(
    useCallback(() => {
      callOpening.current = false;
    }, []),
  );

  const landed = useRef(false);
  /** Whether the reader is at the bottom, so a new message should follow them. */
  const atBottom = useRef(true);

  // A different conversation opens at its own bottom, not the last one's.
  useEffect(() => {
    landed.current = false;
    atBottom.current = true;
  }, [id]);

  const onScroll = useCallback<NonNullable<ListProps<Row>["onScroll"]>>((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const fromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    atBottom.current = fromBottom <= NEAR_BOTTOM_DP;
  }, []);

  /**
   * Keep the newest message in view — without stealing the scroll.
   *
   * Two jobs behind one event. Opening a thread that overflows must ARRIVE at
   * the bottom rather than animate down to it from the top, so the first call
   * jumps. After that, a message landing should only pull the view down if the
   * reader was already there; otherwise scrolling up to re-read something
   * would be undone by the next message to arrive.
   */
  const onContentSizeChange = useCallback(() => {
    if (!landed.current) {
      landed.current = true;
      listRef.current?.scrollToEnd({ animated: false });
      return;
    }

    if (atBottom.current) listRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Sending a voice message is intent to see it, like sending text.
  const onVoiceSent = useCallback(() => {
    atBottom.current = true;
  }, []);
  const composerVoice = useComposerVoice(id, onVoiceSent);

  function onSend() {
    const body = draft.trim();
    if (!body) return;
    // Sending is intent to see your own message, wherever you had scrolled to.
    atBottom.current = true;
    void send(id, body);
  }

  function onReact(emoji: string) {
    const target = reactingTo;
    setReactingTo(null);
    if (target) void toggleReaction(id, target.id, emoji);
  }

  async function onUnmatch() {
    setConfirm(null);
    if (!thread) return;
    await unmatch(thread.matchId, thread.id);
    router.back();
  }

  async function onBlock() {
    setConfirm(null);
    if (!thread || !partner) return;
    await safetyService.block(partner.id);
    // Blocking implies unmatching: they must not be able to reach you.
    await unmatch(thread.matchId, thread.id);
    router.back();
  }

  const name = partner?.name ?? "";
  const rows = buildRows(messages);

  function header() {
    return (
      <ThreadHeader
        name={name}
        source={avatarSource(partner?.avatarId)}
        onPress={
          partner
            ? () => router.push({ pathname: "/user/[id]", params: { id: partner.id } })
            : undefined
        }
      />
    );
  }

  /**
   * Open the call screen — once.
   *
   * A bare `router.push` here let a fast double-tap stack TWO call screens, and
   * each one starts its own call, so the other phone rings twice for one tap.
   * The ref is not debouncing taste: a call is a side effect someone else
   * experiences, so it should be impossible to issue twice, not merely
   * unlikely (PLAN #201).
   *
   * Released on blur rather than on a timer, so returning from the call screen
   * re-arms it exactly when the screen is usable again.
   */
  function startCall() {
    if (callOpening.current) return;
    callOpening.current = true;
    router.push({ pathname: "/call/[id]", params: { id } });
  }

  function actions() {
    return (
      <ThreadActions
        canCall={active}
        callLabel={`Call ${name}`}
        onCall={startCall}
        onOpenMenu={() => setMenuOpen(true)}
      />
    );
  }

  function body() {
    if (loading) {
      return (
        <Box style={{ padding: theme.spacing.xl }}>
          <ThreadSkeleton count={5} />
        </Box>
      );
    }

    // Only when there is nothing to show. A refresh that fails over a
    // conversation already on screen must not replace it with an error — the
    // messages are still true, and the cached ones are what the reader came
    // back for.
    if (error && rows.length === 0) return <ErrorState onRetry={() => void loadMessages(id)} />;

    if (rows.length === 0) {
      return (
        <EmptyState
          icon={{ ios: "hand.wave", android: "waving_hand" }}
          title={copy.chat.emptyMessagesTitle}
          message={copy.chat.emptyMessagesBody}
        />
      );
    }

    return (
      <List<Row>
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.sm,
        }}
        onContentSizeChange={onContentSizeChange}
        // No `scrollEventThrottle`: FlatList defaults it to 0.0001 so its own
        // viewability and `onEndReached` stay responsive, and this handler is
        // three subtractions and a ref write. Raising it would slow the list's
        // internals down to speed up nothing.
        onScroll={onScroll}
        renderItem={({ item }) => {
          if (item.kind === "day") return <DaySeparator label={item.label} />;

          const { message } = item;
          if (message.kind === "system") return <SystemMessage body={message.body} />;

          if (message.kind === "voice" && message.voice) {
            return (
              <VoiceBubble
                messageId={message.id}
                voice={message.voice}
                mine={message.senderId === viewerId}
                timestamp={formatClockTime(new Date(message.createdAt).getTime())}
                reactions={message.reactions}
                onLongPress={active ? () => setReactingTo(message) : undefined}
              />
            );
          }

          return (
            <ChatBubble
              body={message.body}
              mine={message.senderId === viewerId}
              timestamp={formatClockTime(new Date(message.createdAt).getTime())}
              reactions={message.reactions}
              onLongPress={active ? () => setReactingTo(message) : undefined}
            />
          );
        }}
      />
    );
  }

  return (
    <ScreenShell onBack={() => router.back()} leading={header()} actions={actions()}>
      {/*
        Not `KeyboardAware`. This screen's content is a list, which absorbs any
        space `KeyboardAvoidingView` hands it, so the composer never moved and
        the keyboard covered it outright. Padding by the measured keyboard
        height is exact and does not depend on frame measurement.
      */}
      <Box style={{ flex: 1, paddingBottom: keyboardInset }}>
        <Box style={{ flex: 1 }}>{body()}</Box>

        {active && composerVoice.error ? (
          <Caption
            color="danger"
            accessibilityLiveRegion="polite"
            style={{ textAlign: "center", paddingVertical: theme.spacing.xs }}
          >
            {composerVoice.error}
          </Caption>
        ) : null}

        {active ? (
          <ChatComposer
            value={draft}
            onChangeText={(value) => setDraft(id, value)}
            onSend={onSend}
            voice={composerVoice.voice}
          />
        ) : (
          <Box
            accessibilityLiveRegion="polite"
            style={{
              padding: theme.spacing.lg,
              // Same reason as the composer it replaces: the bar's background
              // runs to the screen edge, the text sits above the gesture bar.
              paddingBottom: theme.spacing.lg + bottomInset,
              borderTopWidth: 1,
              borderTopColor: theme.color.divider,
              backgroundColor: theme.color.surfaceSunken,
            }}
          >
            <Body color="textSecondary" style={{ textAlign: "center" }}>
              {copy.chat.unmatchedByThem}
            </Body>
          </Box>
        )}
      </Box>

      <ThreadMenu
        visible={menuOpen}
        muted={thread?.muted ?? false}
        onDismiss={() => setMenuOpen(false)}
        onViewProfile={() => {
          setMenuOpen(false);
          if (partner) router.push({ pathname: "/user/[id]", params: { id: partner.id } });
        }}
        onToggleMute={() => {
          setMenuOpen(false);
          if (!thread) return;
          const next = !thread.muted;
          setThread({ ...thread, muted: next });
          void setMuted(thread.id, next);
        }}
        onReport={() => {
          setMenuOpen(false);
          if (partner) router.push({ pathname: "/report/[id]", params: { id: partner.id } });
        }}
        onBlock={() => {
          setMenuOpen(false);
          setConfirm("block");
        }}
        onUnmatch={() => {
          setMenuOpen(false);
          setConfirm("unmatch");
        }}
        onSimulateUnmatch={
          __DEV__ && thread
            ? () => {
                setMenuOpen(false);
                matchesService.endMatchByThemSync(thread.matchId);
                setActive(false);
              }
            : undefined
        }
      />

      <ReactionPicker
        visible={reactingTo !== null}
        selected={reactingTo?.reactions.find((r) => r.userId === viewerId)?.emoji}
        onSelect={onReact}
        onDismiss={() => setReactingTo(null)}
      />

      <ConfirmDialog
        visible={confirm === "unmatch"}
        title={copy.chat.unmatchTitle(name)}
        message={copy.chat.unmatchBody}
        confirmLabel={copy.chat.unmatchConfirm}
        destructive
        onConfirm={() => void onUnmatch()}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        visible={confirm === "block"}
        title={copy.safety.blockTitle(name)}
        message={copy.safety.blockBody}
        confirmLabel={copy.safety.blockConfirm}
        destructive
        onConfirm={() => void onBlock()}
        onCancel={() => setConfirm(null)}
      />
    </ScreenShell>
  );
}
