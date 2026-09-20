/**
 * Pick one of the preset avatars.
 *
 * This is the whole of "add a photo" in this product — there is no camera, no
 * upload, no crop and no gallery anywhere (PLAN §1). Every option here is one
 * of the ~30 preset illustrations referenced by id, so real artwork drops in as
 * data without this changing.
 */

import type { ImageSource } from "expo-image";

import { Avatar } from "@/components/common/atoms/Avatar";
import { Box } from "@/components/common/atoms/Box";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type AvatarOption = { id: string; label: string; source?: ImageSource };

export type AvatarPickerProps = {
  options: readonly AvatarOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Tiles per row. */
  columns?: number;
};

export function AvatarPicker({
  options,
  selectedId,
  onSelect,
  columns = 4,
}: AvatarPickerProps) {
  const theme = useTheme();

  return (
    <Box
      accessibilityRole="radiogroup"
      // No gap on the container: `columns` tiles at `100/columns`% already fill
      // the row exactly, and any gap pushes the last one onto the next line —
      // `columns={5}` was rendering four. Spacing comes from the tile padding.
      style={{ flexDirection: "row", flexWrap: "wrap" }}
    >
      {options.map((option) => {
        const selected = option.id === selectedId;

        return (
          <Tappable
            key={option.id}
            onPress={() => onSelect(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={{
              width: `${100 / columns}%`,
              alignItems: "center",
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.lg,
              borderWidth: 3,
              // Transparent rather than absent, so selecting does not reflow
              // the grid by three pixels.
              borderColor: selected ? theme.color.accent : "transparent",
            }}
          >
            <Avatar source={option.source} name={option.label} size="lg" />
          </Tappable>
        );
      })}
    </Box>
  );
}
