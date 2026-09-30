import { router } from "expo-router";
import { useCallback, useState } from "react";

import {
  EmptyState,
  List,
  ScreenShell,
  formatRelativeTime,
  useAsyncStatus,
  useTheme,
} from "@/components/common";
import { useFocusLoad } from "@/components/common/hooks/useFocusLoad";
import { Box } from "@/components/common/atoms/Box";
import { ThreadSkeleton } from "@/components/common/molecules/ThreadSkeleton";
import { SentLikeRow, type SentLikeStatus } from "@/components/likes/organisms/SentLikeRow";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { likesService } from "@/services/likes.service";
import { matchesService } from "@/services/matches.service";
import { profilesService } from "@/services/profiles.service";
import type { Like, PublicProfile } from "@/services/types";

type SentLike = { like: Like; profile: PublicProfile; status: SentLikeStatus };

const STATUS_LABEL: Record<SentLikeStatus, string> = {
  matched: copy.home.sentStatusMatched,
  requested: copy.home.sentStatusRequested,
  liked: copy.home.sentStatusLiked,
};

/**
 * People YOU liked — the other half of "Likes you".
 *
 * Your own likes, so there is no premium gate here. Each row says where it
 * stands and opens the profile, whose footer carries the one action that fits
 * (Message once they accept — PLAN #244).
 *
 * Loads on focus: accept a request elsewhere, come back, and the row reads
 * "Connected".
 */
export default function SentLikesScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<SentLike[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const [likes, matches] = await Promise.all([
        likesService.listOutboundLikes(),
        matchesService.listMatches(),
      ]);
      const connected = new Set(
        matches.filter((m) => !m.endedAt).flatMap((m) => m.userIds),
      );
      // A profile that no longer resolves (closed, blocked) drops out rather
      // than failing the whole list.
      const resolved = await Promise.all(
        likes.map(async (like): Promise<SentLike | null> => {
          try {
            const profile = await profilesService.getProfile(like.toUserId);
            const status: SentLikeStatus = connected.has(like.toUserId)
              ? "matched"
              : like.note
                ? "requested"
                : "liked";
            return { like, profile, status };
          } catch {
            return null;
          }
        }),
      );
      setError(null);
      setItems(resolved.filter((item): item is SentLike => item !== null));
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusLoad(load);

  const status = useAsyncStatus({ isLoading: loading, error, data: items });

  return (
    <ScreenShell title={copy.home.sentLikesTitle} onBack={() => router.back()}>
      {status === "loading" ? (
        <Box style={{ paddingTop: theme.spacing.md }}>
          <ThreadSkeleton />
        </Box>
      ) : status === "empty" || status === "error" ? (
        <EmptyState
          icon={{ ios: "heart", android: "favorite_border" }}
          title={copy.home.sentLikesEmptyTitle}
          message={copy.home.sentLikesEmptyBody}
          actionLabel={copy.home.sentLikesBrowse}
          onActionPress={() => router.navigate("/(tabs)")}
        />
      ) : (
        <List
          data={items ?? []}
          keyExtractor={(item) => item.like.id}
          contentContainerStyle={{ paddingVertical: theme.spacing.sm }}
          renderItem={({ item }) => (
            <SentLikeRow
              name={item.profile.name}
              age={item.profile.age}
              source={avatarSource(item.profile.avatarId)}
              status={item.status}
              statusLabel={STATUS_LABEL[item.status]}
              when={formatRelativeTime(new Date(item.like.createdAt).getTime())}
              onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.profile.id } })}
            />
          )}
        />
      )}
    </ScreenShell>
  );
}
