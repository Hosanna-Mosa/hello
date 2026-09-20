/**
 * Render-tree snapshots for every molecule, organism and template, in both
 * themes (PLAN Phase 2).
 *
 * Same contract as the Phase 1 atom baseline: once captured, later phases must
 * not change these. A diff is either a regression or a deliberate re-baseline.
 */

import {
  Avatar,
  AvatarPicker,
  Button,
  CallShell,
  ConfirmDialog,
  CountBadge,
  DistanceLabel,
  EmptyState,
  ErrorState,
  Field,
  FormShell,
  InterestChips,
  ListRow,
  ListScreenShell,
  ProfileCard,
  RangeSlider,
  ScreenShell,
  SearchBar,
  SectionHeader,
  SettingsRow,
  SheetShell,
  Skeleton,
  TabScreenShell,
  ToggleRow,
  WizardProgress,
  WizardShell,
  Box,
} from "@/components/common";

import { renderAtom, THEMES } from "../atoms/__tests__/renderAtom";

const INTERESTS = [
  { id: "hiking", label: "Hiking" },
  { id: "board-games", label: "Board games" },
  { id: "coffee", label: "Coffee" },
  { id: "film", label: "Film" },
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

describe.each(THEMES)("shared kit — %s theme", (theme) => {
  // ---------- molecules ----------
  it("Button primary", () =>
    expect(renderAtom(<Button label="Continue" onPress={noop} />, theme)).toMatchSnapshot());

  it("Button secondary", () =>
    expect(renderAtom(<Button label="Not now" onPress={noop} variant="secondary" />, theme)).toMatchSnapshot());

  it("Button ghost", () =>
    expect(renderAtom(<Button label="Skip" onPress={noop} variant="ghost" />, theme)).toMatchSnapshot());

  it("Button destructive", () =>
    expect(renderAtom(<Button label="Unmatch" onPress={noop} variant="destructive" />, theme)).toMatchSnapshot());

  it("Button loading", () =>
    expect(renderAtom(<Button label="Continue" onPress={noop} loading />, theme)).toMatchSnapshot());

  it("Button disabled", () =>
    expect(renderAtom(<Button label="Continue" onPress={noop} disabled />, theme)).toMatchSnapshot());

  it("Field", () =>
    expect(renderAtom(<Field label="Your name" value="Maya" onChangeText={noop} />, theme)).toMatchSnapshot());

  it("Field with error", () =>
    expect(renderAtom(<Field label="Your name" value="" onChangeText={noop} error="Required" />, theme)).toMatchSnapshot());

  it("Field with counter", () =>
    expect(renderAtom(<Field label="Bio" value="Hello" onChangeText={noop} maxLength={300} showCounter />, theme)).toMatchSnapshot());

  it("SearchBar empty", () =>
    expect(renderAtom(<SearchBar value="" onChangeText={noop} />, theme)).toMatchSnapshot());

  it("SearchBar with text", () =>
    expect(renderAtom(<SearchBar value="maya" onChangeText={noop} />, theme)).toMatchSnapshot());

  it("EmptyState", () =>
    expect(renderAtom(
      <EmptyState
        icon={{ ios: "person.2", android: "group" }}
        title="No one nearby"
        message="Try widening your search radius."
        actionLabel="Widen radius"
        onActionPress={noop}
      />, theme)).toMatchSnapshot());

  it("ErrorState", () =>
    expect(renderAtom(<ErrorState onRetry={noop} />, theme)).toMatchSnapshot());

  it("Skeleton", () => expect(renderAtom(<Skeleton />, theme)).toMatchSnapshot());

  it("Skeleton circle", () =>
    expect(renderAtom(<Skeleton width={64} height={64} radius={999} />, theme)).toMatchSnapshot());

  it("ListRow", () =>
    expect(renderAtom(
      <ListRow title="Maya" subtitle="See you Saturday!" leading={<Avatar name="Maya" />} onPress={noop} />,
      theme)).toMatchSnapshot());

  it("ListRow muted", () =>
    expect(renderAtom(<ListRow title="Daniel" subtitle="Unmatched" muted />, theme)).toMatchSnapshot());

  it("SettingsRow", () =>
    expect(renderAtom(<SettingsRow label="Discovery" value="25 km" onPress={noop} />, theme)).toMatchSnapshot());

  it("SettingsRow destructive", () =>
    expect(renderAtom(<SettingsRow label="Delete account" destructive onPress={noop} />, theme)).toMatchSnapshot());

  it("ToggleRow on", () =>
    expect(renderAtom(<ToggleRow label="Show me on app" value onValueChange={noop} />, theme)).toMatchSnapshot());

  it("ToggleRow off with description", () =>
    expect(renderAtom(
      <ToggleRow label="Active recently" description="Premium" value={false} onValueChange={noop} disabled />,
      theme)).toMatchSnapshot());

  it("SectionHeader", () =>
    expect(renderAtom(<SectionHeader title="Outdoors" />, theme)).toMatchSnapshot());

  it("SectionHeader with action", () =>
    expect(renderAtom(<SectionHeader title="Filters" actionLabel="Reset" onActionPress={noop} />, theme)).toMatchSnapshot());

  it("WizardProgress", () =>
    expect(renderAtom(<WizardProgress step={4} total={7} />, theme)).toMatchSnapshot());

  it("DistanceLabel", () =>
    expect(renderAtom(<DistanceLabel metres={2500} />, theme)).toMatchSnapshot());

  it("InterestChips read-only", () =>
    expect(renderAtom(<InterestChips interests={INTERESTS} max={2} />, theme)).toMatchSnapshot());

  it("InterestChips selectable", () =>
    expect(renderAtom(
      <InterestChips interests={INTERESTS} selectedIds={["hiking"]} onToggle={noop} selectionLimit={2} />,
      theme)).toMatchSnapshot());

  it("CountBadge", () =>
    expect(renderAtom(
      <CountBadge count={12} icon={{ ios: "heart", android: "favorite" }} label="Likes" onPress={noop} />,
      theme)).toMatchSnapshot());

  it("RangeSlider", () =>
    expect(renderAtom(
      <RangeSlider min={18} max={80} values={[18, 45]} onChange={noop} label="Age" />,
      theme)).toMatchSnapshot());

  it("RangeSlider single handle", () =>
    expect(renderAtom(
      <RangeSlider min={1} max={100} values={[1, 25]} onChange={noop} singleHandle label="Distance" />,
      theme)).toMatchSnapshot());

  // ---------- organisms ----------
  it("ConfirmDialog destructive", () =>
    expect(renderAtom(
      <ConfirmDialog
        visible
        title="Unmatch Maya?"
        message="This can't be undone. Your conversation will be deleted for both of you."
        confirmLabel="Unmatch"
        destructive
        onConfirm={noop}
        onCancel={noop}
      />, theme)).toMatchSnapshot());

  it("ConfirmDialog hidden renders nothing visible", () =>
    expect(renderAtom(
      <ConfirmDialog visible={false} title="x" message="y" confirmLabel="z" onConfirm={noop} onCancel={noop} />,
      theme)).toMatchSnapshot());

  it("ProfileCard grid", () =>
    expect(renderAtom(<ProfileCard person={PERSON} onPress={noop} />, theme)).toMatchSnapshot());

  it("ProfileCard full", () =>
    expect(renderAtom(<ProfileCard person={PERSON} layout="full" />, theme)).toMatchSnapshot());

  it("AvatarPicker", () =>
    expect(renderAtom(
      <AvatarPicker
        options={[
          { id: "a1", label: "Avatar 1" },
          { id: "a2", label: "Avatar 2" },
        ]}
        selectedId="a1"
        onSelect={noop}
      />, theme)).toMatchSnapshot());

  // ---------- templates ----------
  it("ScreenShell", () =>
    expect(renderAtom(<ScreenShell title="Settings" onBack={noop}><Box /></ScreenShell>, theme)).toMatchSnapshot());

  it("TabScreenShell", () =>
    expect(renderAtom(<TabScreenShell title="Nearby"><Box /></TabScreenShell>, theme)).toMatchSnapshot());

  it("FormShell", () =>
    expect(renderAtom(
      <FormShell title="Edit bio" onBack={noop} footer={<Button label="Save" onPress={noop} />}><Box /></FormShell>,
      theme)).toMatchSnapshot());

  it("WizardShell", () =>
    expect(renderAtom(
      <WizardShell step={5} total={7} question="What are you into?" hint="Pick at least 3" onBack={noop}
        footer={<Button label="Continue" onPress={noop} />}>
        <InterestChips interests={INTERESTS} selectedIds={["hiking"]} onToggle={noop} />
      </WizardShell>, theme)).toMatchSnapshot());

  it("SheetShell", () =>
    expect(renderAtom(
      <SheetShell title="Filters" actionLabel="Reset" onActionPress={noop}
        footer={<Button label="Show 412 people" onPress={noop} />}><Box /></SheetShell>,
      theme)).toMatchSnapshot());

  it("ListScreenShell content", () =>
    expect(renderAtom(
      <ListScreenShell status="content" title="Nearby" empty={{ title: "No one nearby" }}><Box /></ListScreenShell>,
      theme)).toMatchSnapshot());

  it("ListScreenShell loading", () =>
    expect(renderAtom(
      <ListScreenShell status="loading" title="Nearby" loading={<Skeleton />} empty={{ title: "No one nearby" }}>
        <Box />
      </ListScreenShell>, theme)).toMatchSnapshot());

  it("ListScreenShell empty", () =>
    expect(renderAtom(
      <ListScreenShell status="empty" title="Nearby"
        empty={{ title: "No one nearby", message: "Try widening your radius.", actionLabel: "Widen", onActionPress: noop }}>
        <Box />
      </ListScreenShell>, theme)).toMatchSnapshot());

  it("ListScreenShell error", () =>
    expect(renderAtom(
      <ListScreenShell status="error" title="Nearby" empty={{ title: "No one nearby" }} error={{ onRetry: noop }}>
        <Box />
      </ListScreenShell>, theme)).toMatchSnapshot());

  it("CallShell", () =>
    expect(renderAtom(
      <CallShell name="Maya" status="02:14" controls={<Box />}><Avatar name="Maya" size="xl" /></CallShell>,
      theme)).toMatchSnapshot());
});
