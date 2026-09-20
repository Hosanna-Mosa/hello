/**
 * Nearby, with location refused.
 *
 * Two different refusals need two different screens. "Denied" can still be
 * asked again, so the button asks. "Blocked" means the OS will never show the
 * dialog again, so the only honest button sends you to Settings — offering
 * "Allow" there would be a button that silently does nothing, which is the most
 * common permission bug.
 *
 * Either way there is a way forward: type a city. Refusing location must not
 * dead-end the product.
 */

import { Box } from "@/components/common/atoms/Box";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";
import { EmptyState } from "@/components/common/molecules/EmptyState";
import { copy } from "@/copy";

export type LocationDeniedProps = {
  /** True when only Settings can change it. */
  blocked: boolean;
  onAllowPress: () => void;
  onOpenSettings: () => void;
  onEnterCityPress: () => void;
};

export function LocationDenied({
  blocked,
  onAllowPress,
  onOpenSettings,
  onEnterCityPress,
}: LocationDeniedProps) {
  const theme = useTheme();

  return (
    <Box style={{ flex: 1 }}>
      <EmptyState
        icon={{ ios: "location.slash", android: "location_off" }}
        title={copy.onboarding.locationQuestion}
        message={blocked ? copy.onboarding.locationBlocked : copy.onboarding.locationBody}
      />

      <Box style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.sm }}>
        <Button
          label={blocked ? copy.common.settings : copy.onboarding.locationAllow}
          onPress={blocked ? onOpenSettings : onAllowPress}
        />
        <Box style={{ alignItems: "center", paddingVertical: theme.spacing.sm }}>
          <Tappable
            onPress={onEnterCityPress}
            accessibilityRole="button"
            accessibilityLabel={copy.onboarding.locationManual}
            hitSlop={12}
          >
            <Label color="textSecondary" style={{ textDecorationLine: "underline" }}>
              {copy.onboarding.locationManual}
            </Label>
          </Tappable>
        </Box>
      </Box>
    </Box>
  );
}
