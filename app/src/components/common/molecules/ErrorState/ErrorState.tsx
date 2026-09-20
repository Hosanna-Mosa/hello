/**
 * Something failed — and a way to try again.
 *
 * Kept separate from `EmptyState` on purpose: they look similar but mean
 * opposite things. Showing "no one nearby" when the request actually failed
 * tells the user something untrue about the world.
 */

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Heading } from "@/components/common/atoms/Heading";
import { Icon } from "@/components/common/atoms/Icon";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";

export type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityRole="alert"
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      <Icon
        name={{ ios: "exclamationmark.triangle", android: "warning" }}
        size={40}
        color="warning"
      />

      <Heading level="title" style={{ textAlign: "center" }}>
        {title}
      </Heading>

      <Body color="textSecondary" style={{ textAlign: "center" }}>
        {message}
      </Body>

      {onRetry ? (
        <Box style={{ marginTop: theme.spacing.sm }}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" inline />
        </Box>
      ) : null}
    </Box>
  );
}
