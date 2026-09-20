import { router } from "expo-router";

import {
  Body,
  Box,
  Button,
  Caption,
  Divider,
  Icon,
  ScreenShell,
  Tappable,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import type { Gender } from "@/services/types";
import { useFiltersStore } from "@/stores/filters.store";

/**
 * Who to show.
 *
 * Only the three concrete kinds are offered. "Prefer not to say" is not a
 * filter option on purpose: someone who chose to keep their gender private, or
 * who turned off "show on my profile" (A5), always appears regardless of what
 * is selected here. Letting this screen exclude them would leak exactly the
 * value they asked us to keep.
 *
 * Selecting none means everyone — the design's "All genders".
 */
const OPTIONS: { kind: Gender["kind"]; label: string }[] = [
  { kind: "woman", label: copy.onboarding.genderWoman },
  { kind: "man", label: copy.onboarding.genderMan },
  { kind: "nonBinary", label: copy.onboarding.genderNonBinary },
];

export default function FilterGendersScreen() {
  const theme = useTheme();
  const genders = useFiltersStore((state) => state.genders);
  const toggleGender = useFiltersStore((state) => state.toggleGender);

  return (
    <ScreenShell title={copy.filters.show} onBack={() => router.back()}>
      <Box style={{ flex: 1, paddingHorizontal: theme.spacing.xl }}>
        <Caption style={{ paddingVertical: theme.spacing.md }}>
          {genders.length === 0 ? copy.filters.allGenders : `${genders.length} selected`}
        </Caption>

        {OPTIONS.map((option) => {
          const selected = genders.includes(option.kind);

          return (
            <Box key={option.kind}>
              <Tappable
                onPress={() => toggleGender(option.kind)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={option.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: 56,
                }}
              >
                <Body style={{ flex: 1 }}>{option.label}</Body>
                {selected ? (
                  <Icon name={{ ios: "checkmark", android: "check" }} size={20} color="accent" />
                ) : null}
              </Tappable>
              <Divider />
            </Box>
          );
        })}

        <Caption color="textTertiary" style={{ paddingTop: theme.spacing.lg }}>
          People who chose not to share their gender always appear.
        </Caption>
      </Box>

      <Box style={{ padding: theme.spacing.xl }}>
        <Button label={copy.common.done} onPress={() => router.back()} />
      </Box>
    </ScreenShell>
  );
}
