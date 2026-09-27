/**
 * Running copy: bios, message bubbles, explanatory paragraphs.
 *
 * `strong` lifts the weight without changing the size, so emphasis never
 * disturbs the vertical rhythm.
 */

import { Text, type TextProps } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";
import { type ColorTokens, typography } from "@/theme";

export type BodyProps = TextProps & {
  /** Use the heavier weight at the same size. */
  strong?: boolean;
  /** A colour role from the theme. Defaults to `textPrimary`. */
  color?: keyof ColorTokens;
};

export function Body({
  strong = false,
  color = "textPrimary",
  style,
  ...rest
}: BodyProps) {
  const theme = useTheme();

  return (
    <Text
      {...rest}
      style={[
        typography[strong ? "bodyStrong" : "body"],
        { color: theme.color[color] },
        style,
      ]}
    />
  );
}
