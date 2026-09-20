/**
 * The people you matched with but have not spoken to yet.
 *
 * Sits above the thread rows, horizontally scrolling. The membership rule is
 * what makes it useful: a match leaves the carousel the moment the conversation
 * has a real message, so it is a list of open loops rather than a second copy
 * of the thread list.
 *
 * Renders nothing when empty — an empty rail with a heading above it is worse
 * than no rail, and the list below already has its own empty state.
 */

import { Avatar } from "@/components/common/atoms/Avatar";
import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Scroller } from "@/components/common/atoms/Scroller";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { SectionHeader } from "@/components/common/molecules/SectionHeader";
import { copy } from "@/copy";

export type NewMatch = {
  threadId: string;
  name: string;
};

export type NewMatchesCarouselProps = {
  matches: NewMatch[];
  onPress: (threadId: string) => void;
};

export function NewMatchesCarousel({ matches, onPress }: NewMatchesCarouselProps) {
  const theme = useTheme();

  if (matches.length === 0) return null;

  return (
    <Box style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
      {/* SectionHeader carries no horizontal padding of its own. */}
      <Box style={{ paddingHorizontal: theme.spacing.xl }}>
        <SectionHeader title={copy.chat.newMatches} />
      </Box>

      <Scroller
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.lg,
          paddingHorizontal: theme.spacing.xl,
        }}
      >
        {matches.map((match) => (
          <Tappable
            key={match.threadId}
            onPress={() => onPress(match.threadId)}
            accessibilityRole="button"
            accessibilityLabel={`New match with ${match.name}. Open conversation.`}
            style={{ alignItems: "center", gap: theme.spacing.xs, width: 72 }}
          >
            {/*
              The ring is what separates "new" from the same avatar on a thread
              row eight pixels below it.
            */}
            <Box
              style={{
                padding: 2,
                borderRadius: theme.radius.pill,
                borderWidth: 2,
                borderColor: theme.color.accent,
              }}
            >
              <Avatar name={match.name} size="lg" />
            </Box>

            <Caption color="textPrimary" numberOfLines={1}>
              {match.name}
            </Caption>
          </Tappable>
        ))}
      </Scroller>
    </Box>
  );
}
