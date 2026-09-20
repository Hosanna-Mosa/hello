/**
 * The only way a component reads design values.
 *
 * Throws rather than falling back to a default theme: a silent fallback would
 * render a light-theme screen inside a dark app and look like a design bug
 * instead of a missing provider.
 */

import { useContext } from "react";

import { ThemeContext } from "@/theme/ThemeProvider";
import type { Theme } from "@/theme";

export function useTheme(): Theme {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme() was called outside <ThemeProvider>. Wire it in src/app/_layout.tsx.",
    );
  }

  return context.theme;
}
