/**
 * A row in the settings tree: label, current value, chevron.
 *
 * `destructive` tints the label red — used for Log out and Delete account,
 * which both then confirm before doing anything.
 */

import { Body } from "@/components/common/atoms/Body";
import { Caption } from "@/components/common/atoms/Caption";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SettingsRowProps = {
  label: string;
  /** The current setting, shown greyed on the right. */
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  destructive?: boolean;
  /** Hide the chevron for a row that opens nothing. */
  showChevron?: boolean;
};

export function SettingsRow({
  label,
  value,
  icon,
  onPress,
  destructive = false,
  showChevron = true,
}: SettingsRowProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        minHeight: 48,
        backgroundColor: theme.color.surface,
      }}
    >
      {icon ? <Icon name={icon} size={20} color={destructive ? "danger" : "textSecondary"} /> : null}

      <Body color={destructive ? "danger" : "textPrimary"} style={{ flex: 1 }}>
        {label}
      </Body>

      {value ? <Caption>{value}</Caption> : null}

      {showChevron && onPress ? (
        <Icon name={{ ios: "chevron.right", android: "chevron_right" }} size={16} color="textTertiary" />
      ) : null}
    </Tappable>
  );
}
