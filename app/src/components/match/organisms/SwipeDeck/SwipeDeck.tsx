"use no memo";

/*
 * This component is built on Reanimated shared values, and `sharedValue.value = x`
 * is their documented API. React Compiler's `react-hooks/immutability` rule
 * treats any hook result as React-owned and flags every write — including the
 * ones inside the gesture worklets, which is most of this file.
 *
 * On Expo SDK 54 the lint config's react-hooks plugin does not have that rule,
 * so no suppression is needed (and ESLint rejects one naming an unknown rule).
 * On an SDK whose plugin has it, restore a file-level
 * `eslint-disable react-hooks/immutability` here. See PLAN R5 and parking #9.
 */

/**
 * The swipe deck.
 *
 * PLAN §2, all of which contradicts older tutorials:
 * - `Gesture.Pan()` from gesture-handler 2. `useAnimatedGestureHandler` is
 *   REMOVED in Reanimated 4 — every pre-2025 swipe-deck example uses it.
 * - `scheduleOnRN`, not `runOnJS`, to cross back to the JS thread. It comes
 *   from `react-native-worklets`; Reanimated does not re-export it.
 * - `"use no memo"` above, because React Compiler's immutability rule treats
 *   `sharedValue.value = x` as mutating React-owned state (R5). The same
 *   collision `RangeSlider` hit.
 *
 * The card array is never mutated — the parent advances an index instead.
 * Splicing it is the #1 React Compiler breakage, and on this surface it shows
 * up as cards that refuse to re-render mid-gesture.
 *
 * No undo and no superlike (PLAN §1), so the deck only moves forward.
 */

import * as Haptics from "expo-haptics";
import { useImperativeHandle, type ReactNode, type Ref } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Box } from "@/components/common/atoms/Box";
import { Stamp } from "@/components/common/atoms/Stamp";
import { useTheme } from "@/components/common/hooks/useTheme";

/** How far a card must travel before release counts as a decision. */
const DECISION_DISTANCE = 120;
/** Or how fast it must be flicked — a short, quick flick should still commit. */
const DECISION_VELOCITY = 800;
/** Cards visible behind the top one. */
const STACK_DEPTH = 2;

/**
 * Lets the screen's buttons run the same animation a swipe does.
 *
 * PLAN requires the tap buttons to mirror the gestures exactly. Calling the
 * like/pass handlers directly would skip the card flying off, so the button and
 * the swipe would visibly differ — this drives the identical path.
 */
export type SwipeDeckHandle = { like: () => void; pass: () => void };

export type SwipeDeckProps<T> = {
  /** Never mutated. The parent advances `index` instead. */
  cards: readonly T[];
  index: number;
  renderCard: (card: T) => ReactNode;
  keyExtractor: (card: T) => string;
  onLike: () => void;
  onPass: () => void;
  /** Tap the card to open the full profile. */
  onExpand?: (card: T) => void;
  ref?: Ref<SwipeDeckHandle>;
};

export function SwipeDeck<T>({
  cards,
  index,
  renderCard,
  keyExtractor,
  onLike,
  onPass,
  onExpand,
  ref,
}: SwipeDeckProps<T>) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const visibleCards = cards.slice(index, index + STACK_DEPTH + 1);

  /** Runs on the JS thread once a card has flown off. */
  function commit(liked: boolean) {
    /**
     * Haptics must never be able to break the decision.
     *
     * On a device with no vibrator — an emulator, or a phone with haptics
     * disabled — `impactAsync` can throw synchronously, and an unguarded call
     * here killed `commit` before it reached `onLike`. The card animated, the
     * stamp appeared, and then the deck silently refused to advance, with no
     * error anywhere. Feedback is a nicety; the swipe is the product.
     */
    try {
      void Haptics.impactAsync(
        liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    } catch {
      // No haptics on this device. Carry on.
    }

    // Reset before the next card mounts, or it appears already thrown.
    translateX.value = 0;
    translateY.value = 0;

    if (liked) onLike();
    else onPass();
  }

  /** The tap buttons drive the same animation, so they behave identically. */
  function fling(liked: boolean) {
    translateX.value = withTiming(
      liked ? width * 1.5 : -width * 1.5,
      { duration: 220 },
      (finished) => {
        "worklet";
        if (finished) scheduleOnRN(commit, liked);
      },
    );
  }

  useImperativeHandle(ref, () => ({
    like: () => fling(true),
    pass: () => fling(false),
  }));

  const pan = Gesture.Pan()
    .onChange((event) => {
      "worklet";
      translateX.value += event.changeX;
      translateY.value += event.changeY;
    })
    .onEnd((event) => {
      "worklet";
      const travelled = Math.abs(translateX.value) > DECISION_DISTANCE;
      const flicked = Math.abs(event.velocityX) > DECISION_VELOCITY;

      if (travelled || flicked) {
        const liked = translateX.value > 0;
        translateX.value = withTiming(
          liked ? width * 1.5 : -width * 1.5,
          { duration: 200 },
          (finished) => {
            "worklet";
            if (finished) scheduleOnRN(commit, liked);
          },
        );
        return;
      }

      // Not far enough — spring back, no decision.
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  /**
   * Tap and pan race rather than compose.
   *
   * A tap must not be swallowed by the pan, and a swipe must not register as a
   * tap — `Race` gives whichever recognises first, which is the behaviour a
   * thumb expects.
   */
  const tap = Gesture.Tap().onEnd((_event, success) => {
    "worklet";
    if (success && onExpand) scheduleOnRN(onExpand, visibleCards[0]);
  });

  const composed = Gesture.Race(pan, tap);

  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      // Rotate around the drag, capped so it never spins.
      { rotate: `${interpolate(translateX.value, [-width, 0, width], [-12, 0, 12])}deg` },
    ],
  }));

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, DECISION_DISTANCE], [0, 1], "clamp"),
  }));

  const nopeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-DECISION_DISTANCE, 0], [1, 0], "clamp"),
  }));

  if (visibleCards.length === 0) return null;

  return (
    <Box style={{ flex: 1 }}>
      {/* Behind-cards first so the top one paints last. */}
      {visibleCards
        .map((card, depth) => ({ card, depth }))
        .reverse()
        .map(({ card, depth }) => {
          if (depth === 0) return null;

          return (
            <Box
              key={keyExtractor(card)}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                ...StyleSheetAbsoluteFill,
                transform: [{ scale: 1 - depth * 0.04 }, { translateY: depth * 12 }],
                opacity: 1 - depth * 0.25,
                zIndex: theme.zIndex.base,
              }}
            >
              {renderCard(card)}
            </Box>
          );
        })}

      <GestureDetector gesture={composed}>
        <Animated.View
          style={[{ ...StyleSheetAbsoluteFill, zIndex: theme.zIndex.card }, topCardStyle]}
        >
          {renderCard(visibleCards[0])}

          <Animated.View
            style={[
              { position: "absolute", top: theme.spacing.xl, left: theme.spacing.xl },
              likeStampStyle,
            ]}
          >
            <Stamp kind="like" />
          </Animated.View>

          <Animated.View
            style={[
              { position: "absolute", top: theme.spacing.xl, right: theme.spacing.xl },
              nopeStampStyle,
            ]}
          >
            <Stamp kind="nope" />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Box>
  );
}

/** Inlined so the deck does not import StyleSheet just for this. */
const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
