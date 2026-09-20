/**
 * A person, as a card.
 *
 * Used by the Home nearby grid and, in Phase 6, as the face of a deck card.
 * With no photographs anywhere in this product, the interest chips and the bio
 * excerpt are what carry it — which is why they are not optional decoration
 * here but the bulk of the card.
 *
 * Structurally typed rather than importing the Phase 3 `User` entity.
 */

import { Avatar } from "@/components/common/atoms/Avatar";
import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Touchable } from "@/components/common/atoms/Touchable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { DistanceLabel } from "@/components/common/molecules/DistanceLabel";
import { InterestChips, type Interest } from "@/components/common/molecules/InterestChips";
import type { ImageSource } from "expo-image";

export type ProfileCardPerson = {
  id: string;
  name: string;
  age: number;
  /** Distance in metres. */
  distanceMetres: number;
  bio?: string;
  interests: readonly Interest[];
  avatar?: ImageSource;
};

export type ProfileCardProps = {
  person: ProfileCardPerson;
  onPress?: () => void;
  /** `grid` is the 2-column Home tile; `full` is the deck card. */
  layout?: "grid" | "full";
};

export function ProfileCard({ person, onPress, layout = "grid" }: ProfileCardProps) {
  const theme = useTheme();
  const isFull = layout === "full";

  return (
    <Touchable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${person.name}, ${person.age}`}
      style={{
        flex: 1,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
        overflow: "hidden",
        ...theme.shadow.sm,
      }}
    >
      {/*
        Fixed-height avatar block. Letting it size to content made one card
        taller than its row neighbour whenever a bio or chip row wrapped, which
        the design shows as a uniform grid.
      */}
      <Box
        style={{
          height: isFull ? 260 : 150,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.color.accentMuted,
        }}
      >
        <Avatar source={person.avatar} name={person.name} size={isFull ? "xl" : "lg"} />
      </Box>

      {/*
        Fixed height on the grid tile. The avatar block alone was not enough —
        a chip row that wrapped still pushed one card taller than its row
        neighbour. The design shows a uniform grid, so the text block is a
        known size and the chips stay on one line.
      */}
      <Box
        style={{
          padding: theme.spacing.md,
          gap: theme.spacing.xs,
          // Tall enough for two chip rows. Interest labels vary a lot
          // ("Jazz" vs "Batch cooking"), so a height that only fits one row
          // either clips the second or lets the card grow — and an uneven grid
          // is more obviously wrong than a little whitespace.
          ...(isFull ? {} : { height: 150 }),
        }}
      >
        <Heading level="title" numberOfLines={1}>
          {`${person.name}, ${person.age}`}
        </Heading>

        <DistanceLabel metres={person.distanceMetres} />

        {/*
          The grid tile shows no bio — the design gives it name, distance and two
          chips only. The bio lives on the full profile and the deck card, where
          there is room for it to be read rather than truncated mid-word.
        */}
        {isFull && person.bio ? (
          <Body color="textSecondary" numberOfLines={3} style={{ marginTop: theme.spacing.xs }}>
            {person.bio}
          </Body>
        ) : null}

        <Box style={{ marginTop: theme.spacing.xs }}>
          <InterestChips
            interests={person.interests}
            max={isFull ? 6 : 2}
            overflow={isFull}
            coloured
          />
        </Box>
      </Box>
    </Touchable>
  );
}
