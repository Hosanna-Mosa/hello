/**
 * Three dots, while the scripted reply "types".
 *
 * Shaped like a received bubble and placed where that bubble will appear, so
 * the list does not jump when the message actually lands.
 *
 * Staggered with `withDelay` rather than three different durations — equal
 * durations and offset starts keep the wave even, where differing durations
 * drift out of phase after a few seconds and start to look broken.
 */

import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";
import { copy } from "@/copy";

const DOTS = [0, 1, 2];
const STAGGER_MS = 160;
const DURATION_MS = 480;

function Dot({ index }: { index: number }) {
  const theme = useTheme();
  const progress = useSharedValue(0.3);

  useEffect(() => {
    progress.value = withDelay(
      index * STAGGER_MS,
      withRepeat(withTiming(1, { duration: DURATION_MS }), -1, true),
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 3 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.textTertiary,
        },
        animatedStyle,
      ]}
    />
  );
}

export function TypingIndicator() {
  const theme = useTheme();

  return (
    <Box
      accessibilityRole="text"
      accessibilityLabel={copy.chat.typing}
      accessibilityLiveRegion="polite"
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.lg,
        borderBottomLeftRadius: theme.radius.xs,
        backgroundColor: theme.color.surface,
        borderWidth: 1,
        borderColor: theme.color.border,
      }}
    >
      {DOTS.map((index) => (
        <Dot key={index} index={index} />
      ))}
    </Box>
  );
}
