import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Box,
  Caption,
  ChatBubble,
  ChatComposer,
  DaySeparator,
  ErrorState,
  List,
  type ListHandle,
  type ListProps,
  ScreenShell,
  ThreadSkeleton,
  formatClockTime,
  formatDayLabel,
  isNewDay,
  useKeyboardInset,
  useTheme,
} from "@/components/common";
import { useResolutionPrompt } from "@/components/support/ticket/hooks/useResolutionPrompt";
import { useSupportTyping } from "@/components/support/ticket/hooks/useSupportTyping";
import { DevResolveAction } from "@/components/support/ticket/molecules/DevResolveAction";
import { ResolutionBanner } from "@/components/support/ticket/molecules/ResolutionBanner";
import { ResolvedFooter } from "@/components/support/ticket/molecules/ResolvedFooter";
import { SenderLabel } from "@/components/support/ticket/molecules/SenderLabel";
import { SupportEventLine } from "@/components/support/ticket/molecules/SupportEventLine";
import { TicketHeader } from "@/components/support/ticket/molecules/TicketHeader";
import { TypingNotice } from "@/components/support/ticket/molecules/TypingNotice";
import { PendingMessage } from "@/components/support/ticket/organisms/PendingMessage";
import { ResolutionDialog } from "@/components/support/ticket/organisms/ResolutionDialog";
import { copy } from "@/copy";
import { isMockMode } from "@/services/client";
import { subscribeSupportTicket, unsubscribeSupportTicket } from "@/services/socket";
import type { SupportMessage } from "@/services/types";
import { type PendingSend, useSupportStore } from "@/stores/support.store";

/** Stable empties — a fresh `[]` per render never settles `useSyncExternalStore`. */
const NO_MESSAGES: SupportMessage[] = [];
const NO_PENDING: PendingSend[] = [];

/** How close to the bottom still counts as reading the newest, in dp. */
const NEAR_BOTTOM_DP = 80;

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "sender"; key: string }
  | { kind: "message"; key: string; message: SupportMessage }
  | { kind: "pending"; key: string; pending: PendingSend };

/**
 * One flat list: day separators, a "Support team" label at the start of each
 * run of replies, the stored messages, then this device's unconfirmed sends.
 */
function buildRows(messages: SupportMessage[], pending: PendingSend[]): Row[] {
  const rows: Row[] = [];
  let previousAt: number | null = null;
  let previousAuthor: string | null = null;

  for (const message of messages) {
    const at = new Date(message.createdAt).getTime();
    if (previousAt === null || isNewDay(previousAt, at)) {
      rows.push({ kind: "day", key: `day-${message.id}`, label: formatDayLabel(at) });
      previousAuthor = null;
    }
    if (message.author === "admin" && previousAuthor !== "admin") {
      rows.push({ kind: "sender", key: `sender-${message.id}` });
    }
    rows.push({ kind: "message", key: message.id, message });
    previousAt = at;
    previousAuthor = message.author;
  }

  for (const send of pending) rows.push({ kind: "pending", key: send.clientMessageId, pending: send });
  return rows;
}

/**
 * One support ticket's conversation.
 *
 * Live both ways: support's replies, the status and "support is typing…"
 * arrive over the socket, and the user's messages go out over it.
 *
 * When support presses Resolve, the ticket becomes `pendingResolution` and
 * this screen asks "Is your issue resolved?" — once, by itself. Yes closes the
 * ticket; no sends it back to support; "not now" leaves the question pinned
 * above the composer. Only the user can close their ticket.
 */
export default function SupportTicketScreen() {
  const theme = useTheme();
  const keyboardInset = useKeyboardInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listRef = useRef<ListHandle<Row>>(null);

  const ticket = useSupportStore((state) => state.tickets.find((t) => t.id === id));
  const messages = useSupportStore((state) => state.messages[id] ?? NO_MESSAGES);
  const pending = useSupportStore((state) => state.pending[id] ?? NO_PENDING);
  const draft = useSupportStore((state) => state.drafts[id] ?? "");
  const supportTyping = useSupportStore((state) => state.typing[id] ?? false);

  const openTicket = useSupportStore((state) => state.openTicket);
  const send = useSupportStore((state) => state.send);
  const retry = useSupportStore((state) => state.retry);
  const discard = useSupportStore((state) => state.discard);
  const setDraft = useSupportStore((state) => state.setDraft);
  const markRead = useSupportStore((state) => state.markRead);
  const respondToResolution = useSupportStore((state) => state.respondToResolution);
  const simulateResolutionRequest = useSupportStore((state) => state.simulateResolutionRequest);

  const [loading, setLoading] = useState(() => messages.length === 0);
  const [error, setError] = useState<unknown>(null);
  const [answering, setAnswering] = useState<"accept" | "decline" | null>(null);
  const [answerFailed, setAnswerFailed] = useState(false);

  const resolved = ticket?.status === "resolved";
  const prompt = useResolutionPrompt(ticket);
  useSupportTyping(id, draft, !resolved);

  const load = useCallback(async () => {
    try {
      await openTicket(id);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [id, openTicket]);

  // The same load as `load`, written inline so a response for a ticket this
  // screen has already left cannot land on the next one.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await openTicket(id);
        if (!cancelled) setError(null);
      } catch (caught) {
        if (!cancelled) setError(caught);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, openTicket]);

  // The ticket's room carries "support is typing…" while it is on screen.
  useEffect(() => {
    subscribeSupportTicket(id);
    return () => unsubscribeSupportTicket(id);
  }, [id]);

  // A reply landing while the ticket is open must not leave it unread.
  const unread = ticket?.unreadCount ?? 0;
  useEffect(() => {
    if (!loading && unread > 0) void markRead(id).catch(() => {});
  }, [id, loading, markRead, unread]);

  // --- scrolling: land at the bottom, follow new messages only if already there
  const landed = useRef(false);
  const atBottom = useRef(true);

  const onScroll = useCallback<NonNullable<ListProps<Row>["onScroll"]>>((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    atBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height <= NEAR_BOTTOM_DP;
  }, []);

  const onContentSizeChange = useCallback(() => {
    if (!landed.current) {
      landed.current = true;
      listRef.current?.scrollToEnd({ animated: false });
      return;
    }
    if (atBottom.current) listRef.current?.scrollToEnd({ animated: true });
  }, []);

  function onSend() {
    const body = draft.trim();
    if (!body) return;
    atBottom.current = true;
    // A failure stays on screen as a retryable message — nothing to catch here.
    void send(id, body).catch(() => {});
  }

  async function answer(accept: boolean) {
    setAnswering(accept ? "accept" : "decline");
    setAnswerFailed(false);
    try {
      await respondToResolution(id, accept);
      prompt.close();
    } catch {
      setAnswerFailed(true);
    } finally {
      setAnswering(null);
    }
  }

  const rows = buildRows(messages, pending);

  function renderRow(row: Row) {
    if (row.kind === "day") return <DaySeparator label={row.label} />;
    if (row.kind === "sender") return <SenderLabel label={copy.support.supportTeam} />;

    if (row.kind === "pending") {
      const { clientMessageId } = row.pending;
      return (
        <PendingMessage
          pending={row.pending}
          onRetry={() => void retry(id, clientMessageId).catch(() => {})}
          onDiscard={() => discard(id, clientMessageId)}
        />
      );
    }

    const { message } = row;
    if (message.author === "system") return <SupportEventLine event={message.event} body={message.body} />;

    return (
      <ChatBubble
        body={message.body}
        mine={message.author === "user"}
        timestamp={formatClockTime(new Date(message.createdAt).getTime())}
      />
    );
  }

  function body() {
    if (loading) {
      return (
        <Box style={{ padding: theme.spacing.xl }}>
          <ThreadSkeleton count={4} />
        </Box>
      );
    }
    if (error && rows.length === 0) return <ErrorState message={copy.support.loadFailed} onRetry={() => void load()} />;

    return (
      <List<Row>
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, gap: theme.spacing.sm }}
        onContentSizeChange={onContentSizeChange}
        onScroll={onScroll}
        renderItem={({ item }) => renderRow(item)}
        ListFooterComponent={
          supportTyping ? (
            <Box style={{ paddingTop: theme.spacing.sm }}>
              <TypingNotice />
            </Box>
          ) : messages.length === 1 && messages[0]?.author === "user" ? (
            <Caption style={{ textAlign: "center", paddingTop: theme.spacing.md }}>{copy.support.firstReplyHint}</Caption>
          ) : null
        }
      />
    );
  }

  // Dev-only, mock-only: play the panel's Resolve button so the prompt can be demoed offline.
  const devResolve =
    __DEV__ && isMockMode() && ticket?.status === "open" ? (
      <DevResolveAction onPress={() => simulateResolutionRequest(id)} />
    ) : undefined;

  return (
    <ScreenShell
      onBack={() => router.back()}
      leading={<TicketHeader subject={ticket?.subject ?? copy.support.title} status={ticket?.status ?? null} />}
      actions={devResolve}
    >
      <Box style={{ flex: 1, paddingBottom: keyboardInset }}>
        <Box style={{ flex: 1 }}>{body()}</Box>

        {answerFailed ? (
          <Caption color="danger" accessibilityLiveRegion="polite" style={{ textAlign: "center", paddingBottom: theme.spacing.xs }}>
            {copy.support.respondFailed}
          </Caption>
        ) : null}

        {prompt.pending && !prompt.open ? <ResolutionBanner onAnswer={prompt.show} /> : null}

        {resolved ? (
          <ResolvedFooter onNewTicket={() => router.replace("/support/new")} />
        ) : ticket ? (
          <ChatComposer
            value={draft}
            onChangeText={(value) => setDraft(id, value)}
            onSend={onSend}
            placeholder={copy.support.composerPlaceholder}
          />
        ) : null}
      </Box>

      <ResolutionDialog
        visible={prompt.open}
        busy={answering}
        onAccept={() => void answer(true)}
        onDecline={() => void answer(false)}
        onDismiss={prompt.close}
      />
    </ScreenShell>
  );
}
