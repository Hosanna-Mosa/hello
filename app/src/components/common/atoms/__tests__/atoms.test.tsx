/**
 * Render-tree snapshots for every atom, in both themes (PLAN Phase 1).
 *
 * These are the Phase 1 baseline. Later phases must not change them: any diff
 * here is either a regression or an intentional re-baseline, never something
 * to absorb silently.
 */

import type { ReactTestRendererJSON } from "react-test-renderer";

import {
  Avatar,
  Badge,
  BareInput,
  Body,
  Box,
  Caption,
  Chip,
  Divider,
  Heading,
  Icon,
  Input,
  KeyboardAware,
  Label,
  List,
  Picture,
  SafeArea,
  Sheet,
  Scroller,
  SectionedList,
  Spinner,
  Stamp,
  Tappable,
  Touchable,
} from "@/components/common";

import { renderAtom, THEMES } from "./renderAtom";

describe.each(THEMES)("atoms — %s theme", (theme) => {
  // --- primitive wrappers ---
  it("Box", () => expect(renderAtom(<Box />, theme)).toMatchSnapshot());

  it("Heading", () =>
    expect(renderAtom(<Heading level="display">Find your people</Heading>, theme)).toMatchSnapshot());

  it("Body", () =>
    expect(renderAtom(<Body>Weekends are for long walks.</Body>, theme)).toMatchSnapshot());

  it("Body strong", () =>
    expect(renderAtom(<Body strong>Weekends are for long walks.</Body>, theme)).toMatchSnapshot());

  it("Label", () => expect(renderAtom(<Label>Interests</Label>, theme)).toMatchSnapshot());

  it("Caption", () => expect(renderAtom(<Caption>2 km away</Caption>, theme)).toMatchSnapshot());

  it("Scroller", () =>
    expect(renderAtom(<Scroller><Box /></Scroller>, theme)).toMatchSnapshot());

  it("List", () =>
    expect(
      renderAtom(
        <List data={["Hiking", "Board games"]} renderItem={({ item }) => <Label>{item}</Label>} />,
        theme,
      ),
    ).toMatchSnapshot());

  it("SectionedList", () =>
    expect(
      renderAtom(
        <SectionedList
          sections={[{ title: "Outdoors", data: ["Hiking"] }]}
          renderItem={({ item }) => <Label>{item}</Label>}
        />,
        theme,
      ),
    ).toMatchSnapshot());

  it("Tappable", () =>
    expect(renderAtom(<Tappable accessibilityRole="button"><Label>Continue</Label></Tappable>, theme)).toMatchSnapshot());

  it("Touchable", () =>
    expect(renderAtom(<Touchable accessibilityRole="button"><Label>Continue</Label></Touchable>, theme)).toMatchSnapshot());

  it("Picture", () =>
    expect(renderAtom(<Picture source={{ uri: "avatar-01" }} />, theme)).toMatchSnapshot());

  it("Input", () =>
    expect(renderAtom(<Input placeholder="Your name" />, theme)).toMatchSnapshot());

  it("Input invalid", () =>
    expect(renderAtom(<Input placeholder="Your name" invalid />, theme)).toMatchSnapshot());

  it("BareInput", () =>
    expect(renderAtom(<BareInput placeholder="Message" />, theme)).toMatchSnapshot());

  it("SafeArea", () => expect(renderAtom(<SafeArea><Box /></SafeArea>, theme)).toMatchSnapshot());

  it("KeyboardAware", () =>
    expect(renderAtom(<KeyboardAware><Box /></KeyboardAware>, theme)).toMatchSnapshot());

  it("Sheet visible", () =>
    expect(renderAtom(<Sheet visible><Box /></Sheet>, theme)).toMatchSnapshot());

  it("Sheet hidden", () =>
    expect(renderAtom(<Sheet visible={false}><Box /></Sheet>, theme)).toMatchSnapshot());

  it("Spinner", () => expect(renderAtom(<Spinner />, theme)).toMatchSnapshot());

  // --- app atoms ---
  it("Icon", () =>
    expect(
      renderAtom(<Icon name={{ ios: "house", android: "home" }} />, theme),
    ).toMatchSnapshot());

  it("Avatar with source", () =>
    expect(renderAtom(<Avatar source={{ uri: "avatar-01" }} name="Maya" />, theme)).toMatchSnapshot());

  it("Avatar fallback", () =>
    expect(renderAtom(<Avatar name="Maya" size="xl" />, theme)).toMatchSnapshot());

  it("Chip unselected", () =>
    expect(renderAtom(<Chip label="Hiking" onPress={() => {}} />, theme)).toMatchSnapshot());

  it("Chip selected", () =>
    expect(renderAtom(<Chip label="Hiking" selected onPress={() => {}} />, theme)).toMatchSnapshot());

  it("Chip static", () => expect(renderAtom(<Chip label="Hiking" />, theme)).toMatchSnapshot());

  it("Badge", () => expect(renderAtom(<Badge count={12} />, theme)).toMatchSnapshot());

  it("Badge overflow", () => expect(renderAtom(<Badge count={143} />, theme)).toMatchSnapshot());

  it("Badge dot", () => expect(renderAtom(<Badge count={1} dot />, theme)).toMatchSnapshot());

  it("Badge zero renders nothing", () => {
    // The helper always returns the provider wrapper, so assert on its
    // children rather than the root: a zero badge must contribute no nodes.
    const tree = renderAtom(<Badge count={0} />, theme) as ReactTestRendererJSON;
    expect(tree.children).toBeNull();
  });

  it("Divider", () => expect(renderAtom(<Divider />, theme)).toMatchSnapshot());

  it("Divider inset", () => expect(renderAtom(<Divider inset={72} />, theme)).toMatchSnapshot());

  it("Stamp like", () => expect(renderAtom(<Stamp kind="like" />, theme)).toMatchSnapshot());

  it("Stamp nope", () => expect(renderAtom(<Stamp kind="nope" />, theme)).toMatchSnapshot());
});
