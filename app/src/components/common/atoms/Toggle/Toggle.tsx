/**
 * `Switch`, themed.
 *
 * Extracted so the platform-colour handling lives in one place. Android draws
 * the thumb in its own accent unless told otherwise, which rendered an "on"
 * switch green against our coral track until it was fixed — a bug worth fixing
 * once rather than at every call site.
 */

import { Switch, type SwitchProps } from "react-native";

import { useTheme } from "@/components/common/hooks/useTheme";

export type ToggleProps = SwitchProps;

export function Toggle(props: ToggleProps) {
  const theme = useTheme();

  return (
    <Switch
      trackColor={{ false: theme.color.border, true: theme.color.accent }}
      thumbColor={theme.color.surface}
      ios_backgroundColor={theme.color.border}
      {...props}
    />
  );
}
