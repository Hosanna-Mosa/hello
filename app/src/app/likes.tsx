import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Body,
  Box,
  Button,
  EmptyState,
  Label,
  List,
  ScreenShell,
  Tappable,
  useAsyncStatus,
  useEntitlements,
  useTheme,
} from "@/components/common";
import { NearbySkeleton } from "@/components/common/molecules/NearbySkeleton";
import { LikeTile } from "@/components/likes/molecules/LikeTile";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { likesService } from "@/services/likes.service";
import { profilesService } from "@/services/profiles.service";
import type { Like, PublicProfile } from "@/services/types";

type InboundLike = { like: Like; profile: PublicProfile };

/** The way to the other half — people YOU liked. In the header, so every state has it. */
const sentLikesLink = (
  <Tappable
    onPress={() => router.push("/likes/sent")}
    accessibilityRole="button"
    accessibilityLabel={copy.home.sentLikesLink}
    hitSlop={12}
  >
    <Label color="accent">{copy.home.sentLikesTitle}</Label>
  </Tappable>
);

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
      <ScreenShell title={copy.home.likesTitle} onBack={() => router.back()} actions={sentLikesLink}>
        <Box style={{ padding: theme.spacing.xl }}>
          <NearbySkeleton count={4} />
        </Box>
      </ScreenShell>
    );
  }

  if (status === "empty" || status === "error") {
    return (
      <ScreenShell title={copy.home.likesTitle} onBack={() => router.back()} actions={sentLikesLink}>
        <EmptyState
          icon={{ ios: "heart", android: "favorite" }}
          title={copy.home.likesEmptyTitle}
          message={copy.home.likesEmptyBody}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={copy.home.likesTitle} onBack={() => router.back()} actions={sentLikesLink}>
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
          <LikeTile
            name={item.profile.name}
            source={avatarSource(item.profile.avatarId)}
            age={item.profile.age}
            locked={!isPremium}
            hasNote={Boolean(item.like.note)}
            lockedLabel={copy.premium.seeWhoLikesYou}
            noteLabel={copy.premium.sentNote}
            onPress={() =>
              isPremium
                ? router.push({ pathname: "/user/[id]", params: { id: item.profile.id } })
                : router.push("/paywall")
            }
          />
        )}
      />
    </ScreenShell>
  );
}
