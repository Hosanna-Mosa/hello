import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Avatar,
  Body,
  Box,
  Button,
  Caption,
  EmptyState,
  Icon,
  Label,
  List,
  ScreenShell,
  Tappable,
  useAsyncStatus,
  useEntitlements,
  useTheme,
} from "@/components/common";
import { NearbySkeleton } from "@/components/home/NearbySkeleton";
import { copy } from "@/copy";
import { likesService } from "@/services/likes.service";
import { profilesService } from "@/services/profiles.service";
import type { Like, PublicProfile } from "@/services/types";

type InboundLike = { like: Like; profile: PublicProfile };

/**
 * People who liked you.
 *
 * The free tier gets the count and the shapes; premium gets the names. The
 * tiles stay in place either way, because the point of the gate is to show that
 * there is something real behind it — an empty screen saying "upgrade" proves
 * nothing and reads as a bluff.
 *
 * No `blurRadius` anywhere: that is an `Image` prop and there are no photographs
 * in this product (PLAN §1). The obscuring is the initial being replaced by a
 * lock glyph, which is honest about what is hidden — a name, not a face.
 */
export default function LikesScreen() {
  const theme = useTheme();
  const { isPremium } = useEntitlements();
  const [items, setItems] = useState<InboundLike[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    void (async () => {
      try {
        const likes = await likesService.listInboundLikes();
        const resolved = await Promise.all(
          likes.map(async (like) => ({
            like,
            profile: await profilesService.getProfile(like.fromUserId),
          })),
        );
        setItems(resolved);
      } catch (caught) {
        setError(caught);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const status = useAsyncStatus({ isLoading: loading, error, data: items });

  if (status === "loading") {
    return (
      <ScreenShell title={copy.home.likesTitle} onBack={() => router.back()}>
        <Box style={{ padding: theme.spacing.xl }}>
          <NearbySkeleton count={4} />
        </Box>
      </ScreenShell>
    );
  }

  if (status === "empty" || status === "error") {
    return (
      <ScreenShell title={copy.home.likesTitle} onBack={() => router.back()}>
        <EmptyState
          icon={{ ios: "heart", android: "favorite" }}
          title={copy.home.likesEmptyTitle}
          message={copy.home.likesEmptyBody}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={copy.home.likesTitle} onBack={() => router.back()}>
      <List
        data={items ?? []}
        keyExtractor={(item) => item.like.id}
        ListHeaderComponent={
          isPremium ? null : (
            /*
             * The count is the whole pitch: "6 people like you" is a fact the
             * free tier can verify, and it is what makes the locked tiles read
             * as withheld rather than empty.
             */
            <Box
              style={{
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.md,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.color.accentMuted,
              }}
            >
              <Body strong>{copy.premium.blurredHint(items?.length ?? 0)}</Body>
              <Button
                label={copy.premium.seeWhoLikesYou}
                onPress={() => router.push("/paywall")}
              />
            </Box>
          )
        }
        numColumns={2}
        columnWrapperStyle={{ gap: theme.spacing.md }}
        contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.md }}
        renderItem={({ item }) => (
          <Tappable
            onPress={() =>
              isPremium
                ? router.push({ pathname: "/user/[id]", params: { id: item.profile.id } })
                : router.push("/paywall")
            }
            accessibilityRole="button"
            accessibilityLabel={
              isPremium
                ? `${item.profile.name}, ${item.profile.age}`
                : copy.premium.seeWhoLikesYou
            }
            style={{
              flex: 1,
              alignItems: "center",
              gap: theme.spacing.sm,
              paddingVertical: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.color.surface,
              borderWidth: 1,
              borderColor: theme.color.border,
            }}
          >
            {isPremium ? (
              <Avatar name={item.profile.name} size="lg" />
            ) : (
              <Box
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: theme.radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.color.surfaceSunken,
                }}
              >
                <Icon name={{ ios: "lock.fill", android: "lock" }} size={24} color="textTertiary" />
              </Box>
            )}

            {isPremium ? (
              <Label>{`${item.profile.name}, ${item.profile.age}`}</Label>
            ) : (
              // A grey bar the width of a name, not the name itself.
              <Box
                style={{
                  width: 84,
                  height: 12,
                  borderRadius: theme.radius.xs,
                  backgroundColor: theme.color.surfaceSunken,
                }}
              />
            )}

            {item.like.note && isPremium ? (
              <Caption numberOfLines={1}>Sent a note</Caption>
            ) : null}
          </Tappable>
        )}
      />
    </ScreenShell>
  );
}
