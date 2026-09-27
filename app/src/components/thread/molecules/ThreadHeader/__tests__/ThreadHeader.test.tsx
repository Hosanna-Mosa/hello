/**
 * Render-tree snapshots for ThreadHeader, in both themes.
 */

import { renderAtom, THEMES } from "@/components/common/atoms/__tests__/renderAtom";

import { ThreadHeader } from "../ThreadHeader";

const noop = () => {};

describe.each(THEMES)("ThreadHeader — %s theme", (theme) => {
  it("idle", () =>
    expect(renderAtom(<ThreadHeader name="Maya" onPress={noop} />, theme)).toMatchSnapshot());

  it("is not tappable before the partner loads", () =>
    expect(renderAtom(<ThreadHeader name="" />, theme)).toMatchSnapshot());
});
