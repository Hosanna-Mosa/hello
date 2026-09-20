/**
 * Resolves which theme is active and hands it down.
 *
 * `app.json` sets `userInterfaceStyle: "automatic"`, so the system decides by
 * default. `override` exists for the in-app theme switch that Phase 3's
 * `ui.store.ts` will drive; until then nothing passes it.
 *
 * No `useMemo` here on purpose — React Compiler is enabled and manual
 * memoisation is discouraged (PLAN §2). The value object is rebuilt, never
 * mutated in place, which is the compiler's one hard requirement.
 */

import { createContext, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { type Theme, type ThemeName, themes } from "./index";

export type ThemeContextValue = { theme: Theme };

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  children: ReactNode;
  /** Force a theme, ignoring the system setting. */
  override?: ThemeName;
};

export function ThemeProvider({ children, override }: ThemeProviderProps) {
  const system = useColorScheme();
  const name: ThemeName = override ?? (system === "dark" ? "dark" : "light");

  const value: ThemeContextValue = { theme: { ...themes[name], name } };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
