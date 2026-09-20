import { router } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";

import {
  Box,
  EmptyState,
  ErrorState,
  List,
  SegmentedControl,
  TabScreenShell,
  Tappable,
  Icon,
  useTheme,
} from "@/components/common";
import { useFocusLoad } from "@/components/common/hooks/useFocusLoad";
import { AdRow } from "@/components/ads/AdRow";
import { NewMatchesCarousel, type NewMatch } from "@/components/chat/NewMatchesCarousel";
import { RequestRow } from "@/components/chat/RequestRow";
import { ThreadRow } from "@/components/chat/ThreadRow";
import { ThreadSkeleton } from "@/components/chat/ThreadSkeleton";
import { copy } from "@/copy";
import type { ThreadPreview } from "@/services/chat.service";
import { profilesService } from "@/services/profiles.service";
import type { PublicProfile } from "@/services/types";
import { useChatStore } from "@/stores/chat.store";

/** The conversation the ad row sits after. One constant, one place. */
const AD_AFTER_ROW = 3;

type SegmentValue = "messages" | "requests";

/** A conversation with nobody having said anything yet. */
function isNewMatch(preview: ThreadPreview): boolean {
  return preview.lastMessage === null;
}

/**
 * Chats — conversations and pending requests.
 *
 * Two segments, one screen. Requests are not a separate route because they are
 * the same inbox at a different stage, and because a badge on a tab you cannot
 * see from here would be the only way to know they exist.
 *
 * The segmented control stays mounted through every state. Hiding it on an
 * empty Requests segment would strand the user with nothing to press.
 */
export default function ChatScreen() {
  const theme = useTheme();
  const [segment, setSegment] = useState<SegmentValue>("messages");

  const previews = useChatStore((state) => state.previews);
  const requests = useChatStore((state) => state.requests);
  const loading = useChatStore((state) => state.loading);
  const error = useChatStore((state) => state.error);
  const loadThreads = useChatStore((state) => state.loadThreads);
  const loadRequests = useChatStore((state) => state.loadRequests);
  const acceptRequest = useChatStore((state) => state.acceptRequest);
  const declineRequest = useChatStore((state) => state.declineRequest);

  /** Partner profiles, keyed by user id — the rows need names. */
  const [people, setPeople] = useState<Record<string, PublicProfile>>({});
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await Promise.all([loadThreads(), loadRequests()]);

    // Resolve every name in one pass. Reading the store rather than closing
    // over `previews` keeps this off the effect's dependency list, which would
    // otherwise re-run the load on its own result.
    const state = useChatStore.getState();
    const ids = new Set([
      ...state.previews.map((preview) => preview.partnerId),
      ...state.requests.map((request) => request.fromUserId),
    ]);

    const profiles = await Promise.all(
      [...ids].map(async (id) => [id, await profilesService.getProfile(id)] as const),
    );
    setPeople(Object.fromEntries(profiles));
  }, [loadThreads, loadRequests]);

  // Refresh on focus, not just on mount: coming back from a thread must show
  // the message you just sent, and coming back from an unmatch must not show
  // the row you just deleted.
  useFocusLoad(load);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function onAccept(requestId: string) {
    setBusyRequestId(requestId);
    try {
      const match = await acceptRequest(requestId);
      /*
       * Straight into the conversation: the note they sent is already its first
       * message (A18), so there is something to reply to.
       *
       * Deliberately no `load()` first. `acceptRequest` already refreshes the
       * threads and the requests, and the only thing left to fetch is the new
       * partner's name for a row the user is about to navigate away from —
       * which `useFocusEffect` picks up when they come back. Awaiting it here
       * cost about three seconds of nothing happening after the tap.
       */
      router.push({ pathname: "/thread/[id]", params: { id: match.threadId } });
    } finally {
      setBusyRequestId(null);
    }
  }

  async function onDecline(requestId: string) {
    setBusyRequestId(requestId);
    try {
      // Silent (A18). No confirmation, no undo, and the sender is never told.
      await declineRequest(requestId);
    } finally {
      setBusyRequestId(null);
    }
  }

  const newMatches: NewMatch[] = previews.filter(isNewMatch).map((preview) => ({
    threadId: preview.thread.id,
    name: people[preview.partnerId]?.name ?? "",
  }));

  const conversations = previews.filter((preview) => !isNewMatch(preview));

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      tintColor={theme.color.accent}
      colors={[theme.color.accent]}
    />
  );

  function messagesBody() {
    if (conversations.length === 0 && newMatches.length === 0) {
      return (
        <EmptyState
          icon={{ ios: "bubble.left.and.bubble.right", android: "forum" }}
          title={copy.chat.emptyThreadsTitle}
          message={copy.chat.emptyThreadsBody}
        />
      );
    }

    return (
      <List
        data={conversations}
        keyExtractor={(item) => item.thread.id}
        contentContainerStyle={{ paddingVertical: theme.spacing.md }}
        refreshControl={refreshControl}
        ListHeaderComponent={
          <NewMatchesCarousel
            matches={newMatches}
            onPress={(threadId) =>
              router.push({ pathname: "/thread/[id]", params: { id: threadId } })
            }
          />
        }
        /*
         * One slot, after the third conversation. Below the fold on a first
         * glance at the inbox, which is the least obnoxious place for it and
         * still gets seen. Renders nothing on premium.
         */
        renderItem={({ item, index }) => (
          <>
            {index === AD_AFTER_ROW ? <AdRow /> : null}
            <ThreadRow
              name={people[item.partnerId]?.name ?? ""}
              snippet={item.lastMessage?.body ?? ""}
              lastMessageAt={new Date(item.thread.lastMessageAt).getTime()}
              unreadCount={item.thread.unreadCount}
              muted={item.thread.muted}
              onPress={() =>
                router.push({ pathname: "/thread/[id]", params: { id: item.thread.id } })
              }
            />
          </>
        )}
      />
    );
  }

  function requestsBody() {
    if (requests.length === 0) {
      return (
        <EmptyState
          icon={{ ios: "tray", android: "inbox" }}
          title={copy.chat.emptyRequestsTitle}
          message={copy.chat.emptyRequestsBody}
        />
      );
    }

    return (
      <List
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.md }}
        refreshControl={refreshControl}
        renderItem={({ item }) => (
          <RequestRow
            name={people[item.fromUserId]?.name ?? ""}
            age={people[item.fromUserId]?.age ?? 0}
            note={item.note}
            createdAt={new Date(item.createdAt).getTime()}
            busy={busyRequestId === item.id}
            onAccept={() => void onAccept(item.id)}
            onDecline={() => void onDecline(item.id)}
            onPress={() =>
              router.push({ pathname: "/user/[id]", params: { id: item.fromUserId } })
            }
          />
        )}
      />
    );
  }

  function body() {
    if (loading && previews.length === 0 && requests.length === 0) {
      return (
        <Box style={{ padding: theme.spacing.xl }}>
          <ThreadSkeleton />
        </Box>
      );
    }
    // Error ahead of empty: a failed load returns no rows, and "no conversations
    // yet" for a network failure tells the user something untrue.
    if (error) return <ErrorState onRetry={() => void load()} />;
    return segment === "messages" ? messagesBody() : requestsBody();
  }

  return (
    <TabScreenShell
      title={copy.chat.title}
      actions={
        __DEV__ && previews.length > 0 ? (
          <Tappable
            onPress={() =>
              router.push({
                pathname: "/incoming-call/[id]",
                params: { id: previews[0].thread.id },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Simulate an incoming call"
            hitSlop={12}
          >
            {/* Dev-only: there is no push infrastructure to ring the device. */}
            <Icon
              name={{ ios: "phone.arrow.down.left", android: "phone_callback" }}
              size={22}
              color="textSecondary"
            />
          </Tappable>
        ) : null
      }
    >
      <Box style={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.sm }}>
        <SegmentedControl<SegmentValue>
          segments={[
            { value: "messages", label: copy.chat.segmentMessages },
            { value: "requests", label: copy.chat.segmentRequests, count: requests.length },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </Box>

      {body()}
    </TabScreenShell>
  );
}
