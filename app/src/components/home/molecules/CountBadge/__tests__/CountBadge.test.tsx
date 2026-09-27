/**
 * Render-tree snapshots for CountBadge, in both themes.
 *
 * Moved out of the shared-kit suite when CountBadge left `common/`: only
 * HomeHeader uses it, so it now lives beside the screen that owns it.
 */

import { renderAtom, THEMES } from "@/components/common/atoms/__tests__/renderAtom";

import { CountBadge } from "../CountBadge";

const noop = () => {};

describe.each(THEMES)("CountBadge — %s theme", (theme) => {
  it("with count", () =>
    expect(
      renderAtom(
        <CountBadge count={12} icon={{ ios: "heart", android: "favorite" }} label="Likes" onPress={noop} />,
        theme,
      ),
    ).toMatchSnapshot());
});
