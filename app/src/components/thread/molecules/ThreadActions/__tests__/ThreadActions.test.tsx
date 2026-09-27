/**
 * Render-tree snapshots for ThreadActions, in both themes.
 *
 * The inactive case is the one worth pinning: an unmatched or blocked thread
 * must not offer a call button at all, while the overflow menu — which is how
 * report and block are reached — must survive.
 */

import { renderAtom, THEMES } from "@/components/common/atoms/__tests__/renderAtom";

import { ThreadActions } from "../ThreadActions";

const noop = () => {};

describe.each(THEMES)("ThreadActions — %s theme", (theme) => {
  it("active thread offers a call", () =>
    expect(
      renderAtom(
        <ThreadActions canCall callLabel="Call Maya" onCall={noop} onOpenMenu={noop} />,
        theme,
      ),
    ).toMatchSnapshot());

  it("inactive thread hides the call but keeps the menu", () => {
    const json = JSON.stringify(
      renderAtom(
        <ThreadActions canCall={false} callLabel="Call Maya" onCall={noop} onOpenMenu={noop} />,
        theme,
      ),
    );
    expect(json).not.toContain("Call Maya");
    expect(json).toContain("More options");
  });
});
