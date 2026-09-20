import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Caption,
  Divider,
  RangeSlider,
  ScreenShell,
  Toggle,
  useDebouncedValue,
  useEntitlements,
  useTheme,
} from "@/components/common";
import { FilterRow } from "@/components/filters/FilterRow";
import { copy } from "@/copy";
import { interestById } from "@/mocks/interests";
import { profilesService } from "@/services/profiles.service";
import { useFiltersStore } from "@/stores/filters.store";

const GENDER_LABELS: Record<string, string> = {
  woman: copy.onboarding.genderWoman,
  man: copy.onboarding.genderMan,
  nonBinary: copy.onboarding.genderNonBinary,
};

/**
 * Discovery filters.
 *
 * A full screen with icon rows, per the design — not the form sheet Phase 5
 * shipped. Interests and genders open sub-screens rather than expanding inline,
 * which keeps this screen readable at a glance: every row says what it is set
 * to without being touched.
 *
 * The live count stays, although the design does not show one. PLAN §5 requires
 * it and it is the only thing that turns an abstract radius into "how many
 * people will I actually see". It sits under the distance value and in the CTA.
 */
export default function FiltersScreen() {
  const theme = useTheme();
  const { isPremium } = useEntitlements();
  const filters = useFiltersStore();

  const [count, setCount] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState(filters.maxDistanceMetres / 1000);
  const [ages, setAges] = useState<[number, number]>([filters.minAge, filters.maxAge]);

  const debouncedDistance = useDebouncedValue(distanceKm, 250);
  const debouncedAges = useDebouncedValue(ages, 250);

  useEffect(() => {
    void profilesService
      .countMatching({
        maxDistanceMetres: debouncedDistance * 1000,
        minAge: debouncedAges[0],
        maxAge: debouncedAges[1],
        interestIds: filters.interestIds.length ? filters.interestIds : undefined,
        activeRecently: filters.activeRecently || undefined,
        genders: filters.genders.length ? filters.genders : undefined,
      })
      .then(setCount);
  }, [debouncedDistance, debouncedAges, filters.interestIds, filters.activeRecently, filters.genders]);

  function apply() {
    filters.setDistance(distanceKm * 1000);
    filters.setAgeRange(ages[0], ages[1]);
    router.back();
  }

  const interestSummary =
    filters.interestIds.length === 0
      ? copy.filters.interestsAny
      : filters.interestIds
          .map((id) => interestById(id)?.label)
          .filter(Boolean)
          .join(", ");

  const genderSummary =
    filters.genders.length === 0
      ? copy.filters.allGenders
      : filters.genders.map((kind) => GENDER_LABELS[kind] ?? kind).join(", ");

  return (
    <ScreenShell
      title={copy.filters.title}
      onBack={() => router.back()}
      actions={
        <Button
          label={copy.common.reset}
          onPress={() => {
            filters.reset();
            setDistanceKm(25);
            setAges([18, 45]);
          }}
          variant="ghost"
          inline
        />
      }
    >
      <Box style={{ flex: 1, paddingHorizontal: theme.spacing.xl }}>
        <FilterRow
          icon={{ ios: "mappin.and.ellipse", android: "location_on" }}
          label={copy.filters.location}
          value={copy.filters.locationValue(Math.round(distanceKm))}
          below={
            <Box style={{ gap: theme.spacing.sm }}>
              <RangeSlider
                min={1}
                max={100}
                values={[1, distanceKm]}
                onChange={(_low, high) => setDistanceKm(high)}
                singleHandle
                label={copy.filters.location}
              />
              {/* Kept despite the design: PLAN §5 requires a live count. */}
              <Caption>{count === null ? " " : copy.filters.liveCount(count)}</Caption>
            </Box>
          }
        />

        <FilterRow
          icon={{ ios: "person.2", android: "group" }}
          label={copy.filters.age}
          value={copy.filters.ageValue(ages[0], ages[1])}
          below={
            <RangeSlider
              // Floors at 18 whatever the handle does (PLAN §1).
              min={18}
              max={80}
              values={ages}
              onChange={(low, high) => setAges([low, high])}
              label={copy.filters.age}
            />
          }
        />

        <Divider />

        {/* Two of the five doors into the paywall (A14). */}
        <FilterRow
          icon={{ ios: "slider.horizontal.3", android: "tune" }}
          label={copy.filters.interests}
          value={isPremium ? interestSummary : undefined}
          locked={!isPremium}
          onPress={() =>
            isPremium ? router.push("/filters/interests") : router.push("/paywall")
          }
        />

        <Divider />

        <FilterRow
          icon={{ ios: "person.crop.circle", android: "account_circle" }}
          label={copy.filters.show}
          value={genderSummary}
          onPress={() => router.push("/filters/genders")}
        />

        <Divider />

        <FilterRow
          icon={{ ios: "bolt", android: "bolt" }}
          label={copy.filters.activeRecently}
          locked={!isPremium}
          onPress={isPremium ? undefined : () => router.push("/paywall")}
          trailing={
            isPremium ? (
              <Toggle
                value={filters.activeRecently}
                onValueChange={filters.setActiveRecently}
                accessibilityLabel={copy.filters.activeRecently}
              />
            ) : undefined
          }
        />
      </Box>

      <Box style={{ padding: theme.spacing.xl }}>
        <Button
          label={count === null ? copy.filters.apply2 : copy.filters.apply(count)}
          onPress={apply}
        />
      </Box>
    </ScreenShell>
  );
}
