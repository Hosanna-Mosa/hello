import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Avatar,
  Button,
  EmptyState,
  List,
  ListRow,
  ScreenShell,
  useAsyncStatus,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { profilesService } from "@/services/profiles.service";
import { useSettingsStore } from "@/stores/settings.store";

/**
 * Blocked people, with a way back out.
 *
 * `profilesService.getProfile` is injected into the store rather than imported
 * by it: blocking is what hides someone from `profiles.service`, so this is the
 * one screen that has to look a blocked person up anyway, and passing the
 * lookup in keeps the store off the service its own filter acts on.
 */
export default function BlockedSettingsScreen() {
  const theme = useTheme();

  const blocked = useSettingsStore((state) => state.blocked);
  const loadBlocked = useSettingsStore((state) => state.loadBlocked);
  const unblock = useSettingsStore((state) => state.unblock);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        await loadBlocked((userId) => profilesService.getProfile(userId));
      } catch (caught) {
        setError(caught);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBlocked]);

  const status = useAsyncStatus({ isLoading: loading, error, data: blocked });

  if (status !== "content") {
    return (
      <ScreenShell title={copy.settings.blocked} onBack={() => router.back()}>
        <EmptyState
          icon={{ ios: "hand.raised", android: "block" }}
          title={copy.settings.blocked}
          message={copy.settings.blockedEmpty}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={copy.settings.blocked} onBack={() => router.back()}>
      <List
        data={blocked}
        keyExtractor={(item) => item.block.id}
        contentContainerStyle={{ paddingVertical: theme.spacing.md }}
        renderItem={({ item }) => {
          const userId = item.block.blockedUserId;
          const name = item.profile?.name ?? "";

          return (
            <ListRow
              title={name}
              leading={<Avatar name={name} size="md" />}
              trailing={
                <Button
                  label={copy.settings.unblock}
                  variant="secondary"
                  inline
                  loading={busyId === userId}
                  onPress={() => {
                    setBusyId(userId);
                    void unblock(userId).finally(() => setBusyId(null));
                  }}
                />
              }
            />
          );
        }}
      />
    </ScreenShell>
  );
}
