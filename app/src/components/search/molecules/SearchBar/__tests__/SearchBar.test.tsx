/**
 * Render-tree snapshots for SearchBar, in both themes.
 *
 * Moved out of the shared-kit suite when SearchBar left `common/`: only the
 * search screen uses it, so it now lives beside the screen that owns it.
 */

import { renderAtom, THEMES } from "@/components/common/atoms/__tests__/renderAtom";

import { SearchBar } from "../SearchBar";

const noop = () => {};

describe.each(THEMES)("SearchBar — %s theme", (theme) => {
  it("empty", () =>
    expect(renderAtom(<SearchBar value="" onChangeText={noop} />, theme)).toMatchSnapshot());

  it("with text", () =>
    expect(renderAtom(<SearchBar value="maya" onChangeText={noop} />, theme)).toMatchSnapshot());
});
