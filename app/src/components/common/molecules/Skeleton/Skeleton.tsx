/**
 * A loading placeholder that breathes.
 *
 * A pulse rather than a sweeping shimmer: it is one shared value driving
 * opacity entirely on the UI thread, so a grid of twenty of these costs
 * nothing on the JS thread while the mock service's 300–800ms latency plays
 * out.
 *
 * No `runOnJS`/`scheduleOnRN` here — the animation never calls back into JS.
 */

import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/components/common/hooks/useTheme";

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  /** Defaults to the `md` radius; pass `pill` for a circular avatar block. */
  radius?: number;
};

export function Skeleton({ width = "100%", height = 16, radius }: SkeletonProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.md,
          backgroundColor: theme.color.surfaceSunken,
        },
        animatedStyle,
      ]}
    />
  );
}
