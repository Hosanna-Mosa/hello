/**
 * A screen that lives under the tab bar.
 *
 * Same as `ScreenShell` minus the back button — a tab root has nothing to go
 * back to.
 *
 * ANDROID: keep the tab bar's height clear at the bottom. On Expo SDK 54
 * (react-native-screens 4.16) the native tab host sizes the React screen to
 * the FULL window, and the Material bottom navigation is then drawn over its
 * last ~80 dp — so a button pinned to the bottom (Home's "Allow location",
 * Match's deck actions) sat half under the tab bar (PLAN #242). The bar is
 * Material 3's 80 dp plus the system bottom inset, which it pads itself with;
 * both measured screens agree (Pixel 6 emulator: 80 + 24 dp gesture bar;
 * a gesture-bar-less phone: 80 dp). iOS lays tab content out above its tab
 * bar on its own, so nothing is added there.
 */

import type { ReactNode } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/common/atoms/Box";
import { ScreenShell } from "@/components/common/templates/ScreenShell";

/** Material 3 bottom navigation height, in dp. */
const ANDROID_TAB_BAR_DP = 80;

export type TabScreenShellProps = {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  leading?: ReactNode;
};

export function TabScreenShell({ children, title, actions, leading }: TabScreenShellProps) {
  const insets = useSafeAreaInsets();
  const tabBarClearance = Platform.OS === "android" ? ANDROID_TAB_BAR_DP + insets.bottom : 0;

  return (
    <ScreenShell title={title} actions={actions} leading={leading} edges={["top", "left", "right"]}>
      {tabBarClearance > 0 ? <Box style={{ flex: 1, paddingBottom: tabBarClearance }}>{children}</Box> : children}
    </ScreenShell>
  );
}
