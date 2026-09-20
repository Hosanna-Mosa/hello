/**
 * Nothing here — and what to do about it.
 *
 * Every empty state in this product offers a way forward: "no one nearby"
 * widens the radius, "out of cards" widens the filters. An empty state with no
 * action is a dead end, and this product has exactly one intentional dead end
 * (the under-18 screen), which is its own route.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Icon, type IconName } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onActionPress,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      {icon ? <Icon name={icon} size={40} color="textTertiary" /> : null}

      <Heading level="title" style={{ textAlign: "center" }}>
        {title}
      </Heading>

      {message ? (
        <Body color="textSecondary" style={{ textAlign: "center" }}>
          {message}
        </Body>
      ) : null}

      {actionLabel && onActionPress ? (
        <Box style={{ marginTop: theme.spacing.sm }}>
          <Button label={actionLabel} onPress={onActionPress} variant="secondary" inline />
        </Box>
      ) : null}
    </Box>
  );
}
