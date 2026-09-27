import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useTheme } from "@/components/common";
import { copy } from "@/copy";

/**
 * The four tabs. Home · Match · Chat · Profile, and only these.
 *
 * NATIVE tabs, from `expo-router/unstable-native-tabs`. `expo-router/tabs` and
 * `expo-router/js-tabs` are the same JS implementation — neither is native, and
 * importing `Tabs` from `expo-router` silently gives you the JS one. In SDK 58
 * this path becomes `expo-router/native-tabs`; expect one import rewrite.
 *
 * Search and Likes are deliberately NOT tabs — they are Home header entries
 * (PLAN §1). Adding a fifth tab is a product change, not a layout tweak.
 *
 * The design system's nav bar labels the second tab "Discover"; PLAN §1 locks
 * it as "Match" and PLAN wins. See parking log #15.
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      tintColor={theme.color.accent}
      backgroundColor={theme.color.surface}
      // Android hides inactive labels by default; the design labels all four.
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{copy.tabs.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="match">
        <NativeTabs.Trigger.Label>{copy.tabs.match}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "rectangle.stack", selected: "rectangle.stack.fill" }}
          md="layers"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>{copy.tabs.chat}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "bubble.left", selected: "bubble.left.fill" }}
          md="chat_bubble"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{copy.tabs.profile}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
