import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Avatar,
  Body,
  Box,
  Caption,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Heading,
  Icon,
  List,
  type ListHandle,
  ScreenShell,
  Tappable,
  formatClockTime,
  formatDayLabel,
  isNewDay,
  useKeyboardInset,
  useTheme,
} from "@/components/common";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { DaySeparator } from "@/components/chat/DaySeparator";
import { ReactionPicker } from "@/components/chat/ReactionPicker";
import { SystemMessage } from "@/components/chat/SystemMessage";
import { ThreadMenu } from "@/components/chat/ThreadMenu";
import { ThreadSkeleton } from "@/components/chat/ThreadSkeleton";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { copy } from "@/copy";
import { chatService } from "@/services/chat.service";
import { matchesService } from "@/services/matches.service";
import { profilesService } from "@/services/profiles.service";
import { safetyService } from "@/services/safety.service";
import type { Message, PublicProfile, Thread } from "@/services/types";
import { useChatStore } from "@/stores/chat.store";

const ME = "me";

/**
 * One shared empty array for a thread with nothing loaded yet.
 *
 * `state.messages[id] ?? []` looks harmless and is not: the literal is a new
 * array on every call, so `useSyncExternalStore` never sees a stable snapshot
 * and React re-renders forever ("The result of getSnapshot should be cached").
 */
const NO_MESSAGES: Message[] = [];

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const listRef = useRef<ListHandle<Row>>(null);

  const messages = useChatStore((state) => state.messages[id] ?? NO_MESSAGES);
  const draft = useChatStore((state) => state.drafts[id] ?? "");
  const typing = useChatStore((state) => state.typing[id] ?? false);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reactingTo, setReactingTo] = useState<Message | null>(null);
  const [confirm, setConfirm] = useState<"unmatch" | "block" | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const loaded = await chatService.getThread(id);
        const partnerId = loaded.participantIds.find((each) => each !== ME) ?? ME;

        const [profile, match] = await Promise.all([
          profilesService.getProfile(partnerId),
          matchesService.getMatchForThread(id),
        ]);
        await loadMessages(id);
        await markRead(id);

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
  }, [id, loadMessages, markRead]);

  // A scripted reply arriving while the thread is open must not leave an unread
  // badge behind on the list.
  useEffect(() => {
    if (!loading && messages.length > 0) void markRead(id);
  }, [id, loading, markRead, messages.length]);

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  function onSend() {
    const body = draft.trim();
    if (!body) return;
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
      <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        {/* In-chat profile peek — the header is the way into it. */}
        <Tappable
          onPress={() =>
            partner
              ? router.push({ pathname: "/user/[id]", params: { id: partner.id } })
              : undefined
          }
          disabled={!partner}
          accessibilityRole="button"
          accessibilityLabel={`${name}. View profile.`}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
          }}
        >
          <Avatar name={name} size="sm" />
          <Box style={{ flex: 1 }}>
            <Heading level="title" numberOfLines={1}>
              {name}
            </Heading>
            {typing ? <Caption color="accent">{copy.chat.typing}</Caption> : null}
          </Box>
        </Tappable>
      </Box>
    );
  }

  function actions() {
    return (
      <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
        {active ? (
          <Tappable
            onPress={() => router.push({ pathname: "/call/[id]", params: { id } })}
            accessibilityRole="button"
            accessibilityLabel={`Call ${name}`}
            hitSlop={12}
          >
            <Icon name={{ ios: "phone", android: "call" }} size={22} />
          </Tappable>
        ) : null}

        <Tappable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="More options"
          hitSlop={12}
        >
          <Icon name={{ ios: "ellipsis", android: "more_horiz" }} size={22} />
        </Tappable>
      </Box>
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

    if (error) return <ErrorState onRetry={() => void loadMessages(id)} />;

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
        onContentSizeChange={scrollToEnd}
        ListFooterComponent={
          typing ? (
            <Box style={{ paddingTop: theme.spacing.sm }}>
              <TypingIndicator />
            </Box>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.kind === "day") return <DaySeparator label={item.label} />;

          const { message } = item;
          if (message.kind === "system") return <SystemMessage body={message.body} />;

          return (
            <ChatBubble
              body={message.body}
              mine={message.senderId === ME}
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

        {active ? (
          <ChatComposer
            value={draft}
            onChangeText={(value) => setDraft(id, value)}
            onSend={onSend}
          />
        ) : (
          <Box
            accessibilityLiveRegion="polite"
            style={{
              padding: theme.spacing.lg,
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
        selected={reactingTo?.reactions.find((r) => r.userId === ME)?.emoji}
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
