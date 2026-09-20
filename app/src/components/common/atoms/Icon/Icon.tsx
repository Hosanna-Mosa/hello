/**
 * One icon component for both platforms.
 *
 * `expo-symbols` renders SF Symbols on iOS and Material Symbols on Android, so
 * a call site names the concept once and each platform draws its own idiom.
 * This replaces `@expo/vector-icons`, which is no longer bundled from SDK 56.
 *
 * Both platform names are required. An icon that exists on only one platform
 * is a hole that shows up as a blank square in a screenshot sweep, not as a
 * build error — so the type makes you supply both up front.
 */

import { type AndroidSymbol, type SFSymbol, SymbolView } from "expo-symbols";

import { useTheme } from "@/components/common/hooks/useTheme";
import type { ColorTokens } from "@/theme";

export type IconName = { ios: SFSymbol; android: AndroidSymbol };

export type IconProps = {
  name: IconName;
  /** Defaults to 24. */
  size?: number;
  /** A colour role from the theme. Defaults to `textPrimary`. */
  color?: keyof ColorTokens;
};

export function Icon({ name, size = 24, color = "textPrimary" }: IconProps) {
  const theme = useTheme();

  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={theme.color[color]}
      // Decorative by default: call sites label the control, not the glyph.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
