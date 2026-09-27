/**
 * Render-tree snapshots for LikeTile, in both themes.
 *
 * The locked case is the one that matters: the snapshot is the record that a
 * locked tile contains no name and no avatar, only the padlock and the grey
 * bar. A diff here that reintroduces the name is a privacy regression, not a
 * styling one.
 */

import { renderAtom, THEMES } from "@/components/common/atoms/__tests__/renderAtom";

import { LikeTile } from "../LikeTile";

const noop = () => {};

const BASE = {
  name: "Maya",
  age: 27,
  onPress: noop,
  lockedLabel: "See who likes you",
  noteLabel: "Sent a note",
};

describe.each(THEMES)("LikeTile — %s theme", (theme) => {
  it("unlocked", () =>
    expect(renderAtom(<LikeTile {...BASE} locked={false} />, theme)).toMatchSnapshot());

  it("unlocked with a note", () =>
    expect(renderAtom(<LikeTile {...BASE} locked={false} hasNote />, theme)).toMatchSnapshot());

  it("locked", () =>
    expect(renderAtom(<LikeTile {...BASE} locked />, theme)).toMatchSnapshot());

  it("locked hides the name even when a note exists", () => {
    const json = JSON.stringify(renderAtom(<LikeTile {...BASE} locked hasNote />, theme));
    expect(json).not.toContain("Maya");
    expect(json).not.toContain("Sent a note");
  });
});
