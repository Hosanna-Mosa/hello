/**
 * DEV + MOCK ONLY: a header button that plays the admin panel's "Resolve".
 *
 * With no server there is no support agent to press it, and without it the
 * "Is your issue resolved?" prompt could not be demoed or checked by hand.
 * The screen renders this only under `__DEV__ && isMockMode()`.
 */

import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { copy } from "@/copy";

export type DevResolveActionProps = {
  onPress: () => void;
};

export function DevResolveAction({ onPress }: DevResolveActionProps) {
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={copy.support.simulateResolve} hitSlop={12}>
      <Icon name={{ ios: "checkmark.seal", android: "task_alt" }} size={22} color="textSecondary" />
    </Tappable>
  );
}
