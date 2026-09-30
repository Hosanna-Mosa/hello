/**
 * One icon component for both platforms.
 *
 * iOS draws SF Symbols through `expo-symbols`. Android draws Material Icons
 * through `@expo/vector-icons`: on SDK 54, `expo-symbols` is iOS-only (Android
 * Material Symbols arrived in a later SDK), and `@expo/vector-icons` is still
 * bundled with Expo. A call site names the concept once and each platform
 * draws its own idiom.
 *
 * Android names are written the Material way, `arrow_back`, and mapped to the
 * icon font's `arrow-back` here — so call sites did not change when the app
 * moved from SDK 57 to 54, and will not change if it moves forward again.
 *
 * Both platform names are required. An icon that exists on only one platform
 * is a hole that shows up as a blank square in a screenshot sweep, not as a
 * build error — so the type makes you supply both up front.
 */

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type SFSymbol, SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Platform } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";
import type { ColorTokens } from "@/theme";

type MaterialName = ComponentProps<typeof MaterialIcons>["name"];

/** `chat-bubble` → `chat_bubble`: the Material spelling call sites use. */
type Underscored<S extends string> = S extends `${infer Head}-${infer Tail}` ? `${Head}_${Underscored<Tail>}` : S;

export type AndroidSymbol = Underscored<MaterialName>;

export type IconName = { ios: SFSymbol; android: AndroidSymbol };

export type IconProps = {
  name: IconName;
  /** Defaults to 24. */
  size?: number;
  /** A colour role from the theme. Defaults to `textPrimary`. */
  color?: keyof ColorTokens;
};

/** The icon font's own name for an Android symbol. */
export function materialName(android: AndroidSymbol): MaterialName {
  return android.replace(/_/g, "-") as MaterialName;
}

export function Icon({ name, size = 24, color = "textPrimary" }: IconProps) {
  const theme = useTheme();

  if (Platform.OS === "android") {
    return (
      <MaterialIcons
        name={materialName(name.android)}
        size={size}
        color={theme.color[color]}
        // Decorative by default: call sites label the control, not the glyph.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  }

  return (
    <SymbolView
      name={name.ios}
      size={size}
      tintColor={theme.color[color]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
