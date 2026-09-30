/**
 * The standing question, pinned above the composer while support waits for an
 * answer.
 *
 * The dialog asks once; this is where the question lives if the person chose
 * "not now". It stays until they answer — or until they write again, which the
 * server treats as "not yet".
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";
import { copy } from "@/copy";

export type ResolutionBannerProps = {
  onAnswer: () => void;
};

export function ResolutionBanner({ onAnswer }: ResolutionBannerProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.color.secondaryMuted,
      }}
    >
      <Icon name={{ ios: "checkmark.seal", android: "task_alt" }} size={22} color="secondary" />
      <Body style={{ flex: 1 }}>{copy.support.resolutionBanner}</Body>
      <Button label={copy.support.resolutionAnswer} onPress={onAnswer} inline />
    </Box>
  );
}
