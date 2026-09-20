/**
 * The four rows under the profile: edit, preferences, safety, help.
 *
 * Straight from the design — icon, label, chevron, hairline between. It is a
 * card rather than a full-bleed list so it reads as a group, which is what
 * separates it from the profile content above it.
 */

import { Divider } from "@/components/common/atoms/Divider";
import { Card } from "@/components/common/molecules/Card";
import { useTheme } from "@/components/common/hooks/useTheme";
import { SettingsRow } from "@/components/common/molecules/SettingsRow";
import { copy } from "@/copy";

export type ProfileMenuProps = {
  onEditPress: () => void;
  onPreferencesPress: () => void;
  onSafetyPress: () => void;
  onHelpPress: () => void;
};

export function ProfileMenu({
  onEditPress,
  onPreferencesPress,
  onSafetyPress,
  onHelpPress,
}: ProfileMenuProps) {
  const theme = useTheme();

  const divider = <Divider inset={theme.spacing.xxxl} />;

  return (
    <Card>
      <SettingsRow
        label={copy.profile.edit}
        icon={{ ios: "pencil", android: "edit" }}
        onPress={onEditPress}
      />
      {divider}
      <SettingsRow
        label={copy.profile.preferences}
        icon={{ ios: "slider.horizontal.3", android: "tune" }}
        onPress={onPreferencesPress}
      />
      {divider}
      <SettingsRow
        label={copy.settings.safety}
        icon={{ ios: "checkmark.shield", android: "verified_user" }}
        onPress={onSafetyPress}
      />
      {divider}
      <SettingsRow
        label={copy.profile.helpAndSupport}
        icon={{ ios: "questionmark.circle", android: "help" }}
        onPress={onHelpPress}
      />
    </Card>
  );
}
