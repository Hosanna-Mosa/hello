/**
 * `ActivityIndicator`.
 *
 * Defaults to the accent colour so a loading state never renders in the
 * platform default grey, which reads as unstyled.
 */

import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";

export type SpinnerProps = ActivityIndicatorProps;

export function Spinner({ color, ...rest }: SpinnerProps) {
  const theme = useTheme();

  return <ActivityIndicator color={color ?? theme.color.accent} {...rest} />;
}
