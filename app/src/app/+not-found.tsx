import { Link } from "expo-router";

import { Box, EmptyState, ScreenShell, useTheme } from "@/components/common";
import { copy } from "@/copy";

/**
 * The unmatched-route screen.
 *
 * Reachable by a bad deep link. Deep links use the dev-build scheme
 * `hello:///…`, and route groups like `(tabs)` do not appear in a real scheme's
 * URL — so a link written with the group in it lands here.
 */
export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <ScreenShell title={copy.errors.notFoundTitle}>
      <EmptyState
        icon={{ ios: "questionmark.circle", android: "help" }}
        title={copy.errors.notFoundTitle}
        message={copy.errors.notFoundBody}
      />
      <Box style={{ padding: theme.spacing.xl, alignItems: "center" }}>
        <Link href="/" style={{ color: theme.color.accent }}>
          Go home
        </Link>
      </Box>
    </ScreenShell>
  );
}
