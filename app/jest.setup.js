/**
 * Jest setup. Runs before any test module is imported.
 *
 * gesture-handler needs its own setup shim before any component that renders a
 * GestureDetector (RangeSlider, the swipe deck).
 */
require("react-native-gesture-handler/jestSetup");

/**
 * Freeze the clock.
 *
 * Deferred from Phase 8 on purpose: freezing rewrites every snapshot that
 * derives a value from "today", and at the time that was churn for no benefit.
 * Phase 10 produced the benefit. Six snapshots broke overnight — the birthday
 * wheel scrolls to a today-relative position, the notifications feed groups by
 * relative day, and Settings → Account renders "Member since" — none of which
 * had changed. A baseline that expires at midnight cannot catch a regression,
 * which is the only reason to keep one.
 *
 * Freezing fixes the whole class at the source rather than screen by screen:
 * fixture anchors, ages computed against `now`, relative times, the like-quota
 * countdown and the `nextId` timestamp all stop moving together.
 *
 * Only the clock is frozen. Timers stay real, because `renderAtomAsync` flushes
 * the mock client's `setTimeout` latency to reach content states — faking those
 * would leave every screen stuck on its loading state.
 */
const FROZEN = new Date("2026-06-15T09:00:00.000Z").getTime();
const RealDate = Date;

class FrozenDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(FROZEN);
      return;
    }
    super(...args);
  }

  static now() {
    return FROZEN;
  }
}

global.Date = FrozenDate;

/**
 * `expo/fetch` cannot load under Jest — it subclasses a native class that only
 * exists on a device. The app reaches it through `src/services/httpFetch.ts`,
 * so map that module onto whatever `global.fetch` is AT CALL TIME: the suites
 * fake the server by assigning `global.fetch`, and this keeps every one of
 * them working unchanged.
 */
jest.mock("@/services/httpFetch", () => ({
  httpFetch: (...args) => global.fetch(...args),
}));
