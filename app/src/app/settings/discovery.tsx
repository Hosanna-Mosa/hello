import { router } from "expo-router";
import { useEffect } from "react";

import {
  Box,
  Caption,
  RangeSlider,
  ScreenShell,
  Scroller,
  SectionHeader,
  ToggleRow,
  formatDistance,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { useFiltersStore } from "@/stores/filters.store";
import { useSettingsStore } from "@/stores/settings.store";

const MIN_AGE = 18;
const MAX_AGE = 70;
const MIN_DISTANCE_KM = 1;
const MAX_DISTANCE_KM = 100;

/**
 * Discovery — who can find you, and who you see.
 *
 * Deliberately the same store the Home and Match filters read. Two places that
 * set "maximum distance" independently is a bug report waiting to happen, so
 * this screen says so in as many words rather than quietly diverging.
 */
export default function DiscoverySettingsScreen() {
  const theme = useTheme();

  const preferences = useSettingsStore((state) => state.preferences);
  const load = useSettingsStore((state) => state.load);
  const setDiscoverable = useSettingsStore((state) => state.setDiscoverable);

  const maxDistanceMetres = useFiltersStore((state) => state.maxDistanceMetres);
  const minAge = useFiltersStore((state) => state.minAge);
  const maxAge = useFiltersStore((state) => state.maxAge);
  const setDistance = useFiltersStore((state) => state.setDistance);
  const setAgeRange = useFiltersStore((state) => state.setAgeRange);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenShell title={copy.settings.discovery} onBack={() => router.back()}>
      <Scroller
        contentContainerStyle={{
          paddingVertical: theme.spacing.lg,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.xl,
        }}
      >
        <ToggleRow
          label={copy.settings.showMe}
          description={copy.settings.showMeHint}
          value={preferences?.discoverable ?? true}
          onValueChange={(next) => void setDiscoverable(next)}
          disabled={!preferences}
        />

        <Box style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.lg }}>
          <SectionHeader title={copy.settings.distance} />
          <Caption color="textPrimary">{formatDistance(maxDistanceMetres)}</Caption>
          <RangeSlider
            min={MIN_DISTANCE_KM}
            max={MAX_DISTANCE_KM}
            values={[MIN_DISTANCE_KM, Math.round(maxDistanceMetres / 1000)]}
            onChange={(_, high) => setDistance(high * 1000)}
            singleHandle
            label={copy.settings.distance}
          />
        </Box>

        <Box style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.lg }}>
          <SectionHeader title={copy.settings.ageRange} />
          <Caption color="textPrimary">{`${minAge}–${maxAge}`}</Caption>
          <RangeSlider
            // Floors at 18 in the store as well — the age gate is not a slider
            // property, it is a product rule (PLAN §1).
            min={MIN_AGE}
            max={MAX_AGE}
            values={[minAge, maxAge]}
            onChange={setAgeRange}
            label={copy.settings.ageRange}
          />
        </Box>

        <Box style={{ paddingHorizontal: theme.spacing.xl }}>
          <Caption>{copy.settings.discoveryHint}</Caption>
        </Box>
      </Scroller>
    </ScreenShell>
  );
}
