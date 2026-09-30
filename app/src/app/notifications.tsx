import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  Box,
  EmptyState,
  ErrorState,
  ScreenShell,
  SectionedList,
  SectionHeader,
  Spinner,
  useAsyncStatus,
  useTheme,
} from "@/components/common";
import { NotificationRow } from "@/components/notifications/organisms/NotificationRow";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { notificationsService } from "@/services/notifications.service";
import { profilesService } from "@/services/profiles.service";
import type { AppNotification, PublicProfile } from "@/services/types";

/** "Today" / "Yesterday" / a date — the grouping key AND the heading. */
function dayLabel(iso: string, now = Date.now()): string {
  const then = new Date(iso);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((startOfToday.getTime() - then.getTime()) / 86_400_000);

  if (then.getTime() >= startOfToday.getTime()) return "Today";
  if (days < 1) return "Yesterday";
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

/**
 * Activity — recent requests and likes, opened from the Home bell.
 *
 * No "notifications are off" banner: it used to show unconditionally, whatever
 * the real permission, because there is no push module to ask (PLAN #252).
 */
export default function NotificationsScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  /** Actor profiles, keyed by user id — the mock directory knows nobody real. */
  const [people, setPeople] = useState<Record<string, PublicProfile>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await notificationsService.list();
      setItems(list);
      // Opening the feed is the read receipt — AFTER the list is read, so the
      // badge only clears for what was actually shown.
      void notificationsService.markAllRead();

      const ids = [...new Set(list.flatMap((each) => (each.actorId ? [each.actorId] : [])))];
      const found = await Promise.all(
        ids.map((id) =>
          profilesService.getProfile(id).then(
            (profile) => [id, profile] as const,
            () => null,
          ),
        ),
      );
      setPeople(Object.fromEntries(found.filter((each) => each !== null)));
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const status = useAsyncStatus({ isLoading: loading, error, data: items });

  // Grouped by day, newest first, preserving the service's ordering.
  const sections = (items ?? []).reduce<{ title: string; data: AppNotification[] }[]>(
    (acc, item) => {
      const title = dayLabel(item.createdAt);
      const last = acc[acc.length - 1];
      if (last?.title === title) return [...acc.slice(0, -1), { title, data: [...last.data, item] }];
      return [...acc, { title, data: [item] }];
    },
    [],
  );

  return (
    <ScreenShell title={copy.home.notificationsTitle} onBack={() => router.back()}>
      {/*
        Loading is NOT empty. Collapsing the two tells the user "nothing here"
        while the request is still in flight — the same lie as showing an empty
        state for a failed fetch.
      */}
      {status === "error" ? (
        <ErrorState onRetry={() => void load()} />
      ) : status === "loading" ? (
        <Box style={{ paddingTop: theme.spacing.xxl, alignItems: "center" }}>
          <Spinner />
        </Box>
      ) : status === "empty" ? (
        <EmptyState
          icon={{ ios: "bell", android: "notifications" }}
          title={copy.home.notificationsEmptyTitle}
          message={copy.home.notificationsEmptyBody}
        />
      ) : (
        <SectionedList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
          renderSectionHeader={({ section }) => (
            <Box style={{ paddingHorizontal: theme.spacing.xl, backgroundColor: theme.color.background }}>
              <SectionHeader title={section.title} />
            </Box>
          )}
          renderItem={({ item }) => {
            const actor = item.actorId ? people[item.actorId] : undefined;
            return (
              <NotificationRow
                actorName={actor?.name}
                actorAvatar={avatarSource(actor?.avatarId)}
                fallbackName={copy.notifications.unknownActor}
                body={item.body}
                timestamp={new Date(item.createdAt).getTime()}
                onPress={
                  // Deep links use the real scheme, where route groups like
                  // `(tabs)` do not appear — so these are plain paths.
                  // `navigate`, not `push`: a request link goes to the Chat TAB,
                  // and push would stack a second copy of the tabs over this.
                  item.deepLink ? () => router.navigate(item.deepLink as never) : undefined
                }
              />
            );
          }}
        />
      )}
    </ScreenShell>
  );
}
