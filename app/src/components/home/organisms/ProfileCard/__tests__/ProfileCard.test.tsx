/**
 * Render-tree snapshots for ProfileCard, in both themes.
 *
 * Moved out of the shared-kit suite when ProfileCard left `common/`: only the
 * home screen uses it, so it now lives beside the screen that owns it.
 */

import { renderAtom, THEMES } from "@/components/common/atoms/__tests__/renderAtom";

import { ProfileCard } from "../ProfileCard";
import type { Interest } from "@/services/types";

const INTERESTS: Interest[] = [
  { id: "hiking", label: "Hiking", category: "outdoors" },
  { id: "board-games", label: "Board games", category: "games" },
  { id: "coffee", label: "Coffee", category: "food" },
  { id: "film", label: "Film", category: "creative" },
];

const PERSON = {
  id: "u1",
  name: "Maya",
  age: 27,
  distanceMetres: 2000,
  bio: "Weekend hiker, terrible cook, always up for a quiz night.",
  interests: INTERESTS,
};

const noop = () => {};

describe.each(THEMES)("ProfileCard — %s theme", (theme) => {
  it("grid", () =>
    expect(renderAtom(<ProfileCard person={PERSON} onPress={noop} />, theme)).toMatchSnapshot());

  it("full", () =>
    expect(renderAtom(<ProfileCard person={PERSON} layout="full" />, theme)).toMatchSnapshot());
});
