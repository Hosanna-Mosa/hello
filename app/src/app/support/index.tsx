import { router } from "expo-router";
import { useCallback, useState } from "react";

import {
  Box,
  Button,
  Caption,
  EmptyState,
  ErrorState,
  Icon,
  List,
  ScreenShell,
  Tappable,
  ThreadSkeleton,
  usePullToRefresh,
  useTheme,
} from "@/components/common";
import { useFocusLoad } from "@/components/common/hooks/useFocusLoad";
import { TicketRow } from "@/components/support/organisms/TicketRow";
import { copy } from "@/copy";
import { useSupportStore } from "@/stores/support.store";

/**
 * Support — every ticket this person has opened, newest activity first.
 *
 * Reloaded on focus, so coming back from a conversation shows its new status
 * and preview; live socket events keep it current while it is on screen. A
 * ticket that needs the user's answer says "Action needed" on its row.
 */
export default function SupportScreen() {
  const theme = useTheme();

  const tickets = useSupportStore((state) => state.tickets);
  const loadTickets = useSupportStore((state) => state.loadTickets);

  const [loading, setLoading] = useState(() => tickets.length === 0);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      await loadTickets();
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [loadTickets]);

  useFocusLoad(load);
  const { refreshing, onRefresh } = usePullToRefresh(load);

  const openNew = () => router.push("/support/new");

  function body() {
    if (loading) {
      return (
        <Box style={{ padding: theme.spacing.xl }}>
          <ThreadSkeleton count={4} />
        </Box>
      );
    }

    if (error && tickets.length === 0) return <ErrorState onRetry={() => void load()} />;

    if (tickets.length === 0) {
      return (
        <Box style={{ flex: 1, justifyContent: "center", padding: theme.spacing.xl, gap: theme.spacing.xl }}>
          <EmptyState
            icon={{ ios: "bubble.left.and.bubble.right", android: "support_agent" }}
            title={copy.support.emptyTitle}
            message={copy.support.emptyBody}
          />
        </Box>
      );
    }

    return (
      <List
        data={tickets}
        keyExtractor={(ticket) => ticket.id}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        contentContainerStyle={{ paddingVertical: theme.spacing.sm }}
        ListHeaderComponent={
          <Caption style={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md }}>
            {copy.support.intro}
          </Caption>
        }
        renderItem={({ item }) => (
          <TicketRow
            ticket={item}
            onPress={() => router.push({ pathname: "/support/[id]", params: { id: item.id } })}
          />
        )}
      />
    );
  }

  return (
    <ScreenShell
      title={copy.support.title}
      onBack={() => router.back()}
      actions={
        <Tappable onPress={openNew} accessibilityRole="button" accessibilityLabel={copy.support.newTicket} hitSlop={12}>
          <Icon name={{ ios: "square.and.pencil", android: "edit_square" }} size={22} color="accent" />
        </Tappable>
      }
    >
      <Box style={{ flex: 1 }}>{body()}</Box>

      <Box style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        <Button label={copy.support.newTicket} onPress={openNew} />
      </Box>
    </ScreenShell>
  );
}
