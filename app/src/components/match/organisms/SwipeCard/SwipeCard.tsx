/**
 * One card in the deck.
 *
 * Presentational only — it knows nothing about gestures. `SwipeDeck` drives
 * position and stamp opacity from the UI thread; this just draws a person.
 *
 * With no photographs anywhere, the illustration block, the chips and the bio
 * are what carry it. Until the avatar art exists (R2) the block shows an
 * initial, which is most visible here because the card is mostly image.
 */


import { Avatar, type AvatarSource } from "@/components/common/atoms/Avatar";
import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Heading } from "@/components/common/atoms/Heading";
import { useTheme } from "@/components/common/hooks/useTheme";
import type { Interest } from "@/services/types";
import { InterestText } from "@/components/common/molecules/InterestText";
import { formatDistance } from "@/components/common/utils/formatDistance";

export type SwipeCardPerson = {
  id: string;
  name: string;
  age: number;
  distanceMetres: number;
  bio?: string;
  interests: readonly Interest[];
  avatar?: AvatarSource;
};

export type SwipeCardProps = {
  person: SwipeCardPerson;
};

export function SwipeCard({ person }: SwipeCardProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        flex: 1,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.color.surface,
        overflow: "hidden",
        ...theme.shadow.lg,
      }}
    >
      <Box
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.color.accentMuted,
        }}
      >
        <Avatar source={person.avatar} name={person.name} size="xl" />

        {/*
          Distance sits on the image, as the design shows. It appears twice in
          the reference (pill and under the name) — that is a generation
          artifact, and saying the same thing twice on one card is noise.
        */}
        <Box
          style={{
            position: "absolute",
            right: theme.spacing.lg,
            bottom: theme.spacing.lg,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.surface,
            ...theme.shadow.sm,
          }}
        >
          <Caption color="textPrimary">{formatDistance(person.distanceMetres)}</Caption>
        </Box>
      </Box>

      <Box style={{ padding: theme.spacing.xl, gap: theme.spacing.md }}>
        <Heading level="heading" numberOfLines={1}>
          {`${person.name}, ${person.age}`}
        </Heading>

        <InterestText interests={person.interests} max={4} overflow={false} numberOfLines={2} />

        {person.bio ? (
          <Body color="textSecondary" numberOfLines={3}>
            {person.bio}
          </Body>
        ) : null}
      </Box>
    </Box>
  );
}
