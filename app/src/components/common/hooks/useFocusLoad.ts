/**
 * Run a loader every time the screen comes into focus.
 *
 * Extracted in Phase 10. Three screens had written this out by hand, and the
 * `useCallback` in it is load-bearing rather than ceremonial: `useFocusEffect`
 * re-subscribes whenever its callback identity changes, so an inline arrow
 * re-runs the effect on every render and the screen reloads forever. That is a
 * footgun worth naming once instead of re-deriving three times.
 *
 * On focus rather than on mount, because a tab screen stays mounted: coming
 * back from editing a bio must show the new bio, and coming back from an
 * unmatch must not show the row you just deleted.
 *
 * NOT exported from `components/common/index.ts`, deliberately. That barrel is
 * router-free, and importing it drags `expo-router` — and its untransformed
 * `standard-navigation` dependency — into every suite that touches the kit,
 * which breaks the pure atom tests at parse time. Import this by path.
 *
 * `load` must be stable — wrap it in `useCallback` at the call site. That is
 * the same requirement the hand-written version had.
 */

import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export function useFocusLoad(load: () => void | Promise<void>): void {
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
}
