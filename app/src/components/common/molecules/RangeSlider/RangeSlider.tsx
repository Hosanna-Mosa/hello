"use no memo";

/**
 * A two-handle range, built from gesture-handler and Reanimated.
 *
 * NOTE — PLAN R5, and the first place it actually bites. React Compiler's
 * `react-hooks/immutability` rule treats `sharedValue.value = x` as mutating
 * something React owns. It does not: a Reanimated shared value is a mutable box
 * that lives on the UI thread, and assigning to it is the documented API.
 * `"use no memo"` is the escape hatch PLAN §2 names for exactly this. It opts
 * this one component out of auto-memoisation; the gestures and animations still
 * run entirely on the UI thread, so nothing is lost here.
 *
 * No slider library is on the approved list, and this is the only control in
 * the product that needs two handles (the age range in Filters). The distance
 * slider uses the same component with the handles locked to one side.
 *
 * Dragging runs entirely on the UI thread; `scheduleOnRN` is what hands the
 * value back to React. It is NOT `runOnJS` — that is the Reanimated 3 name and
 * every pre-2025 tutorial gets this wrong (PLAN §2). Note `scheduleOnRN` comes
 * from `react-native-worklets`; Reanimated does not re-export it.
 *
 * `onChange` fires continuously while dragging so the filter sheet can show a
 * live count. Debounce it at the call site with `useDebouncedValue`.
 */

import type { LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Box } from "@/components/common/atoms/Box";
import { useTheme } from "@/components/common/hooks/useTheme";

const THUMB = 28;
const TRACK_HEIGHT = 4;

export type RangeSliderProps = {
  min: number;
  max: number;
  /** Current [low, high]. */
  values: readonly [number, number];
  onChange: (low: number, high: number) => void;
  /** Called once when the drag ends — use for the expensive query. */
  onChangeEnd?: (low: number, high: number) => void;
  step?: number;
  /** Hide the low handle for a one-sided range like distance. */
  singleHandle?: boolean;
  label?: string;
};

export function RangeSlider({
  min,
  max,
  values,
  onChange,
  onChangeEnd,
  step = 1,
  singleHandle = false,
  label = "Range",
}: RangeSliderProps) {
  const theme = useTheme();

  const trackWidth = useSharedValue(0);
  const lowValue = useSharedValue(values[0]);
  const highValue = useSharedValue(values[1]);

  /** value → x offset in px. */
  function toPosition(value: number, width: number) {
    "worklet";
    if (max === min) return 0;
    return ((value - min) / (max - min)) * width;
  }

  /** x offset in px → value, snapped to `step` and clamped. */
  function toValue(position: number, width: number) {
    "worklet";
    if (width === 0) return min;
    const ratio = Math.min(Math.max(position / width, 0), 1);
    const raw = min + ratio * (max - min);
    return Math.min(Math.max(Math.round(raw / step) * step, min), max);
  }

  function makeGesture(which: "low" | "high") {
    return Gesture.Pan()
      .onChange((event) => {
        "worklet";
        const width = trackWidth.value;
        if (width === 0) return;

        const current = which === "low" ? lowValue.value : highValue.value;
        const next = toValue(toPosition(current, width) + event.changeX, width);

        if (which === "low") {
          // Handles may meet but never cross.
          lowValue.value = Math.min(next, highValue.value);
        } else {
          highValue.value = singleHandle ? next : Math.max(next, lowValue.value);
        }

        scheduleOnRN(onChange, lowValue.value, highValue.value);
      })
      .onFinalize(() => {
        "worklet";
        if (onChangeEnd) scheduleOnRN(onChangeEnd, lowValue.value, highValue.value);
      });
  }

  const lowThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: toPosition(lowValue.value, trackWidth.value) - THUMB / 2 }],
  }));

  const highThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: toPosition(highValue.value, trackWidth.value) - THUMB / 2 }],
  }));

  const fillStyle = useAnimatedStyle(() => {
    const lowX = singleHandle ? 0 : toPosition(lowValue.value, trackWidth.value);
    const highX = toPosition(highValue.value, trackWidth.value);
    return { left: lowX, width: Math.max(highX - lowX, 0) };
  });

  function handleLayout(event: LayoutChangeEvent) {
    // react-hooks/immutability treats a hook result as React-owned and flags
    // this assignment. It is a false positive: a Reanimated shared value is a
    // mutable box on the UI thread and `.value = x` is its documented API.
    // On Expo SDK 54 the lint plugin has no such rule, so nothing is
    // suppressed; on an SDK whose plugin has it, restore
    // `eslint-disable-next-line react-hooks/immutability` above this line.
    // See PLAN R5 and parking log #9.
    trackWidth.value = event.nativeEvent.layout.width;
  }

  const thumbStyle = {
    position: "absolute" as const,
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
    borderWidth: 2,
    borderColor: theme.color.accent,
    ...theme.shadow.sm,
  };

  return (
    <Box
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: values[1] }}
      onLayout={handleLayout}
      style={{ height: THUMB, justifyContent: "center" }}
    >
      {/* rail */}
      <Box
        style={{
          height: TRACK_HEIGHT,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.surfaceSunken,
        }}
      />

      {/* selected span */}
      <Animated.View
        style={[
          {
            position: "absolute",
            height: TRACK_HEIGHT,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.color.accent,
          },
          fillStyle,
        ]}
      />

      {singleHandle ? null : (
        <GestureDetector gesture={makeGesture("low")}>
          <Animated.View style={[thumbStyle, lowThumbStyle]} />
        </GestureDetector>
      )}

      <GestureDetector gesture={makeGesture("high")}>
        <Animated.View style={[thumbStyle, highThumbStyle]} />
      </GestureDetector>
    </Box>
  );
}
