/**
 * The welcome carousel.
 *
 * Three slides, paged horizontally, with dots below. Swiping is the only
 * control — there is no Next, because the primary button underneath is the one
 * action and a second forward affordance competes with it.
 *
 * Art gap: only slide one has its own illustration. Slides two and three reuse
 * it until the client supplies more (see parking log).
 */

import { useState } from "react";
import { useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Picture } from "@/components/common/atoms/Picture";
import { Scroller } from "@/components/common/atoms/Scroller";
import { useTheme } from "@/components/common/hooks/useTheme";

export type CarouselSlide = {
  title: string;
  subtitle: string;
  illustration: number;
};

export type ValueCarouselProps = {
  slides: readonly CarouselSlide[];
};

export function ValueCarousel({ slides }: ValueCarouselProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== page) setPage(next);
  }

  return (
    <Box style={{ flex: 1 }}>
      <Scroller
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {slides.map((slide) => (
          <Box
            key={slide.title}
            style={{ width, alignItems: "center", paddingHorizontal: theme.spacing.xl }}
          >
            <Picture
              source={slide.illustration}
              contentFit="contain"
              style={{ width: width - theme.spacing.xl * 2, height: 260 }}
              accessibilityLabel="Three friends sharing coffee"
            />

            <Heading
              level="display"
              style={{ textAlign: "center", marginTop: theme.spacing.xl }}
            >
              {slide.title}
            </Heading>

            <Body
              color="textSecondary"
              style={{ textAlign: "center", marginTop: theme.spacing.md, fontSize: 16, lineHeight: 24 }}
            >
              {slide.subtitle}
            </Body>
          </Box>
        ))}
      </Scroller>

      <Box
        accessibilityRole="tablist"
        accessibilityLabel={`Page ${page + 1} of ${slides.length}`}
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.lg,
        }}
      >
        {slides.map((slide, index) => (
          <Box
            key={slide.title}
            style={{
              width: 8,
              height: 8,
              borderRadius: theme.radius.pill,
              backgroundColor:
                index === page ? theme.color.accent : theme.color.borderStrong,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
