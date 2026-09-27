/**
 * A screen that lives under the tab bar.
 *
 * Same as `ScreenShell` minus the bottom inset and the back button — the tab
 * bar already occupies the bottom safe area, and a tab root has nothing to go
 * back to.
 */

import type { ReactNode } from "react";

import { ScreenShell } from "@/components/common/templates/ScreenShell";

export type TabScreenShellProps = {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  leading?: ReactNode;
};

export function TabScreenShell({ children, title, actions, leading }: TabScreenShellProps) {
  return (
    <ScreenShell title={title} actions={actions} leading={leading} edges={["top", "left", "right"]}>
      {children}
    </ScreenShell>
  );
}
