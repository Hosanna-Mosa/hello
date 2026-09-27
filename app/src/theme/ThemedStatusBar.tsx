/**
 * The status bar, following the active theme.
 *
 * Must sit *inside* `ThemeProvider` — it reads the resolved theme rather than
 * the system setting, because the two can now disagree: the app is dark by
 * default and the user can switch it, so a status bar wired to `useColorScheme`
 * would show dark glyphs on a dark background for anyone whose phone is in
 * light mode. Invisible icons, and nothing in the JS logs to explain it.
 *
 * It also owns the native window background. Without that, the colour behind
 * the JS tree stays the platform default and flashes white between screens on
 * a dark build.
 */

import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";

import { useTheme } from "@/components/common/hooks/useTheme";

export function ThemedStatusBar() {
  const theme = useTheme();
  const background = theme.color.background;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(background);
  }, [background]);

  return (
    // `style` names the GLYPH colour, not the bar: "light" means light icons,
    // which is what a dark background needs.
    <StatusBar style={theme.name === "dark" ? "light" : "dark"} />
  );
}
