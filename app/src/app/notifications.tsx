import { router } from "expo-router";
import { useEffect, useState } from "react";

import { Linking } from "react-native";

import {
  Box,
  Caption,
  Icon,
  Label,
  Tappable,
  EmptyState,
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
import { userById } from "@/mocks/profiles";
import type { AppNotification } from "@/services/types";

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

export default function NotificationsScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void notificationsService
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
    // Opening the feed is the read receipt.
    void notificationsService.markAllRead();
  }, []);

  const status = useAsyncStatus({ isLoading: loading, data: items });

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
        Recovery state: the feed still works with OS notifications off, but the
        user will not hear about anything until they open the app. Saying so is
        the difference between "quiet" and "broken".
      */}
      <Box
        accessibilityRole="alert"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          marginHorizontal: theme.spacing.xl,
          marginBottom: theme.spacing.md,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.color.surfaceSunken,
        }}
      >
        <Icon name={{ ios: "bell.slash", android: "notifications_off" }} size={18} color="textSecondary" />
        <Caption style={{ flex: 1 }}>{copy.home.notificationsDisabled}</Caption>
        <Tappable
          onPress={() => Linking.openSettings()}
          accessibilityRole="button"
          accessibilityLabel={copy.common.settings}
          hitSlop={8}
        >
          <Label color="accent">{copy.common.settings}</Label>
        </Tappable>
      </Box>
      {/*
        Loading is NOT empty. Collapsing the two tells the user "nothing here"
        while the request is still in flight — the same lie as showing an empty
        state for a failed fetch.
      */}
      {status === "loading" ? (
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
            const actor = item.actorId ? userById(item.actorId) : undefined;
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
                  item.deepLink ? () => router.push(item.deepLink as never) : undefined
                }
              />
            );
          }}
        />
      )}
    </ScreenShell>
  );
}
