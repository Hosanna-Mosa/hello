/**
 * Test helper: render an atom inside the providers it needs, in a chosen theme.
 *
 * Every atom is snapshotted in BOTH themes. A dark value that was never wired
 * up shows as an identical light/dark snapshot, which is exactly the failure
 * the Phase 1 gate exists to catch.
 *
 * `initialMetrics` is passed rather than mocking safe-area-context: real insets
 * are measured natively and never resolve under the test renderer, leaving an
 * empty tree. Fixed metrics keep snapshots deterministic.
 */

import type { ReactElement } from "react";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";
import TestRenderer, { type ReactTestRendererJSON } from "react-test-renderer";

import { ThemeProvider } from "@/theme/ThemeProvider";
import type { ThemeName } from "@/theme";

const TEST_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function renderAtom(
  element: ReactElement,
  theme: ThemeName,
): ReactTestRendererJSON | ReactTestRendererJSON[] | null {
  let renderer!: TestRenderer.ReactTestRenderer;

  TestRenderer.act(() => {
    renderer = TestRenderer.create(
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <ThemeProvider override={theme}>{element}</ThemeProvider>
      </SafeAreaProvider>,
    );
  });

  const json = renderer.toJSON();

  // Unmount before returning. Without this every tree stays mounted for the
  // whole run, and anything with an endless animation — Skeleton's
  // `withRepeat(..., -1)` — keeps a frame loop alive, so the Jest worker never
  // exits. The symptom is a hung test run, not a failing one.
  TestRenderer.act(() => {
    renderer.unmount();
  });

  return json;
}

/** Both themes, so a test body never has to repeat itself. */
export const THEMES: ThemeName[] = ["light", "dark"];

/**
 * Render, then let pending promises settle before capturing.
 *
 * Screens fetch on mount, so the synchronous `renderAtom` only ever captures
 * their loading state. Set the client's latency to 0 and flush a few microtask
 * turns and the real content renders — which is what the Phase 5 gate means by
 * "every screen AND every state".
 */
export async function renderAtomAsync(
  element: ReactElement,
  theme: ThemeName,
  ticks = 8,
): Promise<ReactTestRendererJSON | ReactTestRendererJSON[] | null> {
  let renderer!: TestRenderer.ReactTestRenderer;

  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <ThemeProvider override={theme}>{element}</ThemeProvider>
      </SafeAreaProvider>,
    );
  });

  // `setTimeout`, not `Promise.resolve`. The mock client delays every call with
  // a timer, which is a macrotask — flushing only microtasks leaves every
  // screen stuck on its loading state and the content snapshots meaningless.
  for (let i = 0; i < ticks; i += 1) {
    await TestRenderer.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  const json = renderer.toJSON();

  await TestRenderer.act(async () => {
    renderer.unmount();
  });

  return json;
}

/**
 * Replace wall-clock times in a rendered tree with `<time>`.
 *
 * A chat bubble renders the time its message was sent, and the fixtures anchor
 * to `Date.now()` at module load (deliberately — see src/mocks/threads.ts), so
 * the same message reads "20:39" on one run and "20:41" on the next. A baseline
 * that churns every run cannot catch a regression, which is the whole point of
 * capturing one (PLAN §3).
 *
 * This is a walk rather than a snapshot serializer because the times appear as
 * element *children*, which pretty-format prints directly without consulting
 * serializers, and embedded inside `accessibilityLabel` strings, which no
 * anchored pattern would match.
 *
 * Matches a two-digit hour only, so the call timer ("0:07") and a call duration
 * ("2:14") — both counted from zero and genuinely deterministic — are left
 * alone.
 *
 * ISO timestamps are skipped, not redacted: "2026-09-19T15:11:21.058Z" contains
 * a clock time, and rewriting the middle of it produced a string the ISO
 * serializer no longer recognised, so the milliseconds leaked into the snapshot
 * and churned on every run — the exact failure this function exists to prevent.
 */
const CLOCK = /\b([01]\d|2[0-3]):[0-5]\d\b/g;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function redactClockTimes<T>(tree: T): T {
  if (typeof tree === "string") {
    return (ISO.test(tree) ? tree : tree.replace(CLOCK, "<time>")) as T;
  }
  if (Array.isArray(tree)) return tree.map(redactClockTimes) as T;

  if (tree && typeof tree === "object") {
    return Object.fromEntries(
      Object.entries(tree).map(([key, value]) => [key, redactClockTimes(value)]),
    ) as T;
  }

  return tree;
}

/**
 * Redact the like-quota countdown.
 *
 * Phase 9 replaced the word "midnight" on the out-of-likes screen with a real
 * countdown to the user's local midnight, which is the right behaviour and a
 * different string on every run. Same churn problem as the chat timestamps,
 * same fix: keep the fact that the screen says *when*, drop what o'clock it
 * happened to be when the suite ran.
 *
 * Scoped to the sentence that carries it, so a "12m" anywhere else survives.
 */
const COUNTDOWN_SENTENCE = "You'll get more at";
const COUNTDOWN = /\b(\d+h \d+m|\d+m|under a minute|now)\b/g;

export function redactCountdown<T>(tree: T): T {
  if (typeof tree === "string") {
    return (tree.includes(COUNTDOWN_SENTENCE)
      ? tree.replace(COUNTDOWN, "<countdown>")
      : tree) as T;
  }
  if (Array.isArray(tree)) return tree.map(redactCountdown) as T;

  if (tree && typeof tree === "object") {
    return Object.fromEntries(
      Object.entries(tree).map(([key, value]) => [key, redactCountdown(value)]),
    ) as T;
  }

  return tree;
}
