/**
 * The grouped interest picker.
 *
 * No screenshot exists for this step — it is built from the design system
 * (§07 Chips/Tags) and the wizard frame the other six steps establish. Category
 * headings, wrapped chips, coral fill when selected.
 *
 * Grouping matters: 60 tags in one undifferentiated wrap is a wall. Eight
 * labelled groups of seven is scannable, and the categories are the taxonomy
 * the filter sheet reuses later.
 */

import { Box } from "@/components/common/atoms/Box";
import { Chip } from "@/components/common/atoms/Chip";
import { useTheme } from "@/components/common/hooks/useTheme";
import { SectionHeader } from "@/components/common/molecules/SectionHeader";
import { INTERESTS_BY_CATEGORY, INTEREST_CATEGORY_LABELS } from "@/mocks/interests";
import type { InterestCategory } from "@/services/types";

export type InterestPickerProps = {
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
};

const ORDER: InterestCategory[] = [
  "outdoors", "food", "games", "music",
  "creative", "wellbeing", "learning", "nightlife",
];

export function InterestPicker({ selectedIds, onToggle }: InterestPickerProps) {
  const theme = useTheme();

  return (
    <Box style={{ gap: theme.spacing.lg }}>
      {ORDER.map((category) => (
        <Box key={category} style={{ gap: theme.spacing.sm }}>
          <SectionHeader title={INTEREST_CATEGORY_LABELS[category]} />

          <Box style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {INTERESTS_BY_CATEGORY[category].map((interest) => (
              <Chip
                key={interest.id}
                label={interest.label}
                selected={selectedIds.includes(interest.id)}
                onPress={() => onToggle(interest.id)}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
