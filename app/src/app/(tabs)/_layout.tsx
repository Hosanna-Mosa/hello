import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";

import { useTheme } from "@/components/common";
import { copy } from "@/copy";

/**
 * The four tabs. Home · Match · Chat · Profile, and only these.
 *
 * NATIVE tabs, from `expo-router/unstable-native-tabs`. `expo-router/tabs` and
 * `expo-router/js-tabs` are the same JS implementation — neither is native, and
 * importing `Tabs` from `expo-router` silently gives you the JS one.
 *
 * SDK 54 API: `Icon` and `Label` are standalone elements from the same import
 * (later SDKs moved them to `NativeTabs.Trigger.Icon` / `.Label`). iOS takes an
 * SF Symbol; Android takes an image, which `VectorIcon` renders from the same
 * Material Icons font the rest of the app uses (see `atoms/Icon`).
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
        <Label>{copy.tabs.home}</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={<VectorIcon family={MaterialIcons} name="home" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="match">
        <Label>{copy.tabs.match}</Label>
        <Icon
          sf={{ default: "rectangle.stack", selected: "rectangle.stack.fill" }}
          androidSrc={<VectorIcon family={MaterialIcons} name="layers" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <Label>{copy.tabs.chat}</Label>
        <Icon
          sf={{ default: "bubble.left", selected: "bubble.left.fill" }}
          androidSrc={<VectorIcon family={MaterialIcons} name="chat-bubble" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>{copy.tabs.profile}</Label>
        <Icon
          sf={{ default: "person", selected: "person.fill" }}
          androidSrc={<VectorIcon family={MaterialIcons} name="person" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
