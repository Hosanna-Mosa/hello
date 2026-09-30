import { router } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { RefreshControl } from "react-native";

import {
  Body,
  Box,
  Heading,
  List,
  ListScreenShell,
  useAsyncStatus,
  usePermission,
  usePullToRefresh,
  useTheme,
} from "@/components/common";
import { AdBanner } from "@/components/common/molecules/AdBanner";
import { ProfileCard } from "@/components/home/organisms/ProfileCard";
import { EmptyNearby } from "@/components/home/organisms/EmptyNearby";
import { useUnreadActivity } from "@/components/home/hooks/useUnreadActivity";
import { HomeHeader } from "@/components/home/organisms/HomeHeader";
import { LocationChip } from "@/components/home/molecules/LocationChip";
import { LocationDenied } from "@/components/home/organisms/LocationDenied";
import { NearbySkeleton } from "@/components/common/molecules/NearbySkeleton";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { interestsByIds } from "@/mocks/interests";
import { likesService } from "@/services/likes.service";
import { profilesService } from "@/services/profiles.service";
import type { PublicProfile } from "@/services/types";
import { useFiltersStore } from "@/stores/filters.store";

/**
 * Home — nearby people, as a 2-column grid (A9).
 *
 * Browse, not decide. The Match deck is where you commit; here you look around.
 * Keeping those two jobs distinct is the mitigation for R9 (two discovery
 * surfaces feeling redundant).
 */
export default function NearbyScreen() {
  const theme = useTheme();
  const toQuery = useFiltersStore((state) => state.toQuery);

  const [profiles, setProfiles] = useState<PublicProfile[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [likeCount, setLikeCount] = useState(0);
  const unreadActivity = useUnreadActivity();

  const permission = usePermission({
    get: async () => {
      const { granted, canAskAgain } = await Location.getForegroundPermissionsAsync();
      return { granted, canAskAgain };
    },
    request: async () => {
      const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      return { granted, canAskAgain };
    },
  });

  useEffect(() => {
    // Async IIFE so nothing sets state synchronously in the effect body.
    void (async () => {
      await permission.check();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The fetch is pure: it returns data and sets no state.
   *
   * That is what lets the effect below avoid setState until after an await —
   * React Compiler's `set-state-in-effect` rule cannot prove a call like
   * `void onRefresh()` defers its writes, and a synchronous setState in an effect
   * genuinely does cause a cascading render.
   */
  async function fetchNearby() {
    const [page, likes] = await Promise.all([
      profilesService.listNearby(toQuery()),
      likesService.listInboundLikes(),
    ]);
    return { profiles: page.items, likeCount: likes.length };
  }

  function apply(data: { profiles: PublicProfile[]; likeCount: number }) {
    setError(null);
    setProfiles(data.profiles);
    setLikeCount(data.likeCount);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchNearby();
        if (!cancelled) apply(data);
      } catch (caught) {
        if (!cancelled) setError(caught);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // A filter change mid-flight must not let the stale response win.
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toQuery]);

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    try {
      apply(await fetchNearby());
    } catch (caught) {
      setError(caught);
    }
  });
  const status = useAsyncStatus({ isLoading: loading, error, data: profiles });

  // A refusal is its own screen, not an empty list (PLAN Phase 5).
  if (permission.state === "denied" || permission.state === "blocked") {
    return (
      <ListScreenShell
        status="content"
        title={copy.home.title}
        empty={{ title: copy.home.emptyTitle }}
      >
        <LocationDenied
          blocked={permission.mustOpenSettings}
          onAllowPress={() => void permission.request()}
          onOpenSettings={permission.openSettings}
          onEnterCityPress={() => router.push("/filters")}
        />
      </ListScreenShell>
    );
  }

  return (
    <ListScreenShell
      status={status}
      leading={<LocationChip onPress={() => router.push("/filters")} />}
      actions={
        <HomeHeader
          likeCount={likeCount}
          notificationCount={unreadActivity}
          onNotificationsPress={() => router.push("/notifications")}
          onSearchPress={() => router.push("/search")}
          onLikesPress={() => router.push("/likes")}
          onFiltersPress={() => router.push("/filters")}
        />
      }
      loading={<NearbySkeleton />}
      empty={{ title: copy.home.emptyTitle }}
      emptyNode={
        <EmptyNearby
          onAdjustFilters={() => router.push("/filters")}
          onRetry={() => void onRefresh()}
        />
      }
      error={{ onRetry: () => void onRefresh() }}
    >
      <List
        ListHeaderComponent={
          <Box style={{ paddingBottom: theme.spacing.lg }}>
            <Heading level="display">{copy.home.title}</Heading>
            <Body
              color="textSecondary"
              style={{ marginTop: theme.spacing.xs, fontSize: 16, lineHeight: 24 }}
            >
              {copy.home.subtitle}
            </Body>

            {/* Renders nothing on premium — the slot decides, not this screen. */}
            <Box style={{ paddingTop: theme.spacing.lg }}>
              <AdBanner />
            </Box>
          </Box>
        }
        data={profiles ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: theme.spacing.md }}
        contentContainerStyle={{
          padding: theme.spacing.xl,
          gap: theme.spacing.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.accent}
            colors={[theme.color.accent]}
          />
        }
        renderItem={({ item }) => (
          <ProfileCard
            person={{
              id: item.id,
              name: item.name,
              age: item.age,
              distanceMetres: item.distanceMetres,
              bio: item.bio,
              interests: interestsByIds(item.interestIds),
              avatar: avatarSource(item.avatarId),
            }}
            onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.id } })}
          />
        )}
      />
    </ListScreenShell>
  );
}
