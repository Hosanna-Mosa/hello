/**
 * Render-tree snapshots for NotificationRow, in both themes.
 *
 * The timestamp is derived from the clock `jest.setup.js` freezes, NOT from
 * `jest.useFakeTimers()`. That setup freezes `Date` and deliberately leaves
 * timers real, because `renderAtomAsync` flushes the mock client's `setTimeout`
 * latency to reach content states — faking timers here would break that for any
 * async render, and the failure surfaces as a snapshot diff in a different
 * suite, which is a long way from the cause (PLAN parking #57).
 */

import { renderAtom, THEMES } from "@/components/common/atoms/__tests__/renderAtom";

import { NotificationRow } from "../NotificationRow";

/** Relative to the frozen clock, so "1h ago" stays "1h ago" forever. */
const AN_HOUR_AGO = Date.now() - 60 * 60 * 1000;

describe.each(THEMES)("NotificationRow — %s theme", (theme) => {
  it("with an actor", () =>
    expect(
      renderAtom(
        <NotificationRow
          actorName="Maya"
          fallbackName="Someone"
          body="liked you"
          timestamp={AN_HOUR_AGO}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("falls back when there is no actor", () =>
    expect(
      renderAtom(
        <NotificationRow fallbackName="Someone" body="Your match expired" timestamp={AN_HOUR_AGO} />,
        theme,
      ),
    ).toMatchSnapshot());
});
