import { router } from "expo-router";
import { useCallback, useState } from "react";

import {
  Avatar,
  Body,
  Box,
  Caption,
  ErrorState,
  Heading,
  Icon,
  InterestChips,
  Scroller,
  Tappable,
  TabScreenShell,
  calculateAge,
  profileCompletenessPercent,
  useEntitlements,
  useTheme,
} from "@/components/common";
import { useFocusLoad } from "@/components/common/hooks/useFocusLoad";
import { CompletenessRing } from "@/components/profile/CompletenessRing";
import { ProfileMenu } from "@/components/profile/ProfileMenu";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { copy } from "@/copy";
import { interestsByIds } from "@/mocks/interests";
import { likesService } from "@/services/likes.service";
import { matchesService } from "@/services/matches.service";
import { meService } from "@/services/me.service";
import type { User } from "@/services/types";

/**
 * Your own profile.
 *
 * Reads as a profile first and a settings hub second, matching the design: the
 * avatar, name, bio and interests are what you came to check, and the four rows
 * underneath are the way out to everything else.
 *
 * The completeness ring is PLAN's, not the design's — the design shows a plain
 * avatar with an edit button. With no photographs in this product (PLAN §1) the
 * bio and interests are the entire profile, so a visible nudge to finish them
 * is worth more here than in an app where a picture does the work.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const { isPremium } = useEntitlements();

  const [me, setMe] = useState<User | null>(null);
  const [matches, setMatches] = useState(0);
  const [likes, setLikes] = useState(0);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    /*
     * Wrapped, because `useFocusEffect` can only be handed a `void` call and an
     * unguarded rejection inside one becomes an unhandled promise rejection —
     * which in a release build is a silent no-op and a blank profile, and in
     * dev is a red box on whatever screen happens to be mounted by then.
     */
    try {
      const [user, matchList, likeList] = await Promise.all([
        meService.getMe(),
        matchesService.listMatches(),
        likesService.listInboundLikes(),
      ]);
      setError(null);
      setMe(user);
      setMatches(matchList.length);
      setLikes(likeList.length);
    } catch (caught) {
      setError(caught);
    }
  }, []);

  // On focus, not just on mount: editing the bio and coming back must show it.
  useFocusLoad(load);

  const age = me?.birthday ? calculateAge(me.birthday) : null;
  const percent = me
    ? profileCompletenessPercent({
        name: me.name,
        birthday: me.birthday,
        gender: me.gender?.kind,
        avatarId: me.avatarId,
        bio: me.bio,
        interests: me.interestIds,
      })
    : 0;

  // Error ahead of everything: a failed load has no name, no bio and no
  // interests, and rendering that as "add a bio" would be a lie.
  if (error) {
    return (
      <TabScreenShell title={copy.profile.title}>
        <ErrorState onRetry={() => void load()} />
      </TabScreenShell>
    );
  }

  return (
    <TabScreenShell
      actions={
        <Tappable
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel={copy.settings.title}
          hitSlop={12}
        >
          <Icon name={{ ios: "gearshape", android: "settings" }} size={24} />
        </Tappable>
      }
    >
      <Scroller
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
        }}
      >
        <Box style={{ alignItems: "center" }}>
          <CompletenessRing percent={percent}>
            <Avatar name={me?.name} size="xl" />

            {/*
              The edit affordance from the design: a pencil on the avatar's
              shoulder. It goes to the same place as the "Edit profile" row —
              two doors to one room is right here, because the avatar is what
              people tap first.
            */}
            <Tappable
              onPress={() => router.push("/edit-profile")}
              accessibilityRole="button"
              accessibilityLabel={copy.profile.edit}
              style={{
                position: "absolute",
                right: 0,
                bottom: 8,
                width: 44,
                height: 44,
                borderRadius: theme.radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.color.surface,
                borderWidth: 1,
                borderColor: theme.color.border,
                ...theme.shadow.md,
              }}
            >
              <Icon name={{ ios: "pencil", android: "edit" }} size={20} color="accent" />
            </Tappable>
          </CompletenessRing>

          <Caption color="accent" style={{ paddingTop: theme.spacing.sm }}>
            {copy.profile.complete(percent)}
          </Caption>
        </Box>

        <Box style={{ gap: theme.spacing.xs }}>
          <Box style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <Heading level="display" style={{ flexShrink: 1 }}>
              {me ? (age !== null ? `${me.name}, ${age}` : me.name) : ""}
            </Heading>

            {/* The badge only exists on premium — nothing greyed out to nag at. */}
            {isPremium ? (
              <Box
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xxs,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.color.accentMuted,
                }}
              >
                <Icon name={{ ios: "star.fill", android: "star" }} size={12} color="accent" />
                <Caption color="accent">{copy.profile.premiumBadge}</Caption>
              </Box>
            ) : null}
          </Box>

          {me?.bio ? (
            <Body color="textSecondary" style={{ fontSize: 16, lineHeight: 24 }}>
              {me.bio}
            </Body>
          ) : (
            <Tappable
              onPress={() => router.push("/edit-profile/bio")}
              accessibilityRole="button"
              accessibilityLabel={copy.profile.addBio}
            >
              <Body color="accent">{copy.profile.addBio}</Body>
            </Tappable>
          )}
        </Box>

        {me && me.interestIds.length > 0 ? (
          // Coloured, as the design shows and as the deck card already does.
          <InterestChips interests={interestsByIds(me.interestIds)} coloured />
        ) : (
          <Tappable
            onPress={() => router.push("/edit-profile/interests")}
            accessibilityRole="button"
            accessibilityLabel={copy.profile.addInterests}
          >
            <Body color="accent">{copy.profile.addInterests}</Body>
          </Tappable>
        )}

        <ProfileStats
          matches={matches}
          likes={likes}
          onMatchesPress={() => router.push("/(tabs)/chat")}
          onLikesPress={() => router.push("/likes")}
        />

        {isPremium ? null : (
          <Tappable
            onPress={() => router.push("/paywall")}
            accessibilityRole="button"
            accessibilityLabel={copy.premium.title}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.color.accentMuted,
            }}
          >
            <Icon name={{ ios: "star.fill", android: "star" }} size={22} color="accent" />
            <Box style={{ flex: 1 }}>
              <Body strong>{copy.premium.title}</Body>
              <Caption>{copy.premium.subtitle}</Caption>
            </Box>
            <Icon
              name={{ ios: "chevron.right", android: "chevron_right" }}
              size={16}
              color="accent"
            />
          </Tappable>
        )}

        <ProfileMenu
          onEditPress={() => router.push("/edit-profile")}
          onPreferencesPress={() => router.push("/settings/discovery")}
          onSafetyPress={() => router.push("/settings/safety")}
          onHelpPress={() => router.push("/settings/help")}
        />
      </Scroller>
    </TabScreenShell>
  );
}
