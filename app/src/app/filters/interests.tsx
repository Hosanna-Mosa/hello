import { router } from "expo-router";

import { Box, Button, Caption, ScreenShell, useTheme } from "@/components/common";
import { InterestPicker } from "@/components/interests/InterestPicker";
import { copy } from "@/copy";
import { useFiltersStore } from "@/stores/filters.store";

/**
 * Filter by interest.
 *
 * A sub-screen rather than an inline section, per the design. Sixty tags
 * expanded inside the filters list would bury the rows beneath them.
 *
 * Selecting none means "any", which is the default and the honest label — an
 * empty selection is not a filter that matches nobody.
 */
export default function FilterInterestsScreen() {
  const theme = useTheme();
  const interestIds = useFiltersStore((state) => state.interestIds);
  const toggleInterest = useFiltersStore((state) => state.toggleInterest);

  return (
    <ScreenShell title={copy.filters.interests} onBack={() => router.back()}>
      <Box style={{ flex: 1, paddingHorizontal: theme.spacing.xl }}>
        <Caption style={{ paddingBottom: theme.spacing.md }}>
          {interestIds.length === 0
            ? "Showing everyone. Pick a few to narrow it down."
            : `${interestIds.length} selected`}
        </Caption>

        <InterestPicker selectedIds={interestIds} onToggle={toggleInterest} />
      </Box>

      <Box style={{ padding: theme.spacing.xl }}>
        <Button label={copy.common.done} onPress={() => router.back()} />
      </Box>
    </ScreenShell>
  );
}
