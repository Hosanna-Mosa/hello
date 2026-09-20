/**
 * A person, as a circle.
 *
 * There are no photographs in this product (PLAN §1) — `source` is always one
 * of the ~30 preset illustrated avatars, referenced by id. When no avatar has
 * been chosen yet, it falls back to the person's initial on a tinted circle
 * rather than a grey silhouette, which reads as a broken image.
 */

import { Image, type ImageSource } from "expo-image";

import { Box } from "@/components/common/atoms/Box";
import { Label } from "@/components/common/atoms/Label";
import { useTheme } from "@/components/common/hooks/useTheme";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 64, xl: 120 };

export type AvatarProps = {
  /** A preset avatar asset. Omit to render the initial fallback. */
  source?: ImageSource;
  /** Used for the fallback initial and the accessibility label. */
  name?: string;
  /** Defaults to `md` (44pt — also the minimum touch target). */
  size?: AvatarSize;
};

export function Avatar({ source, name, size = "md" }: AvatarProps) {
  const theme = useTheme();
  const dimension = SIZES[size];

  const shared = {
    width: dimension,
    height: dimension,
    borderRadius: theme.radius.pill,
  };

  if (!source) {
    return (
      <Box
        accessible
        accessibilityRole="image"
        accessibilityLabel={name ? `${name}'s avatar` : "Avatar"}
        style={[
          shared,
          {
            backgroundColor: theme.color.accentMuted,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        {/*
          lineHeight must scale with fontSize. `Label` sets 18, so overriding
          only the size clipped the glyph on the 120pt preview — visible on the
          avatar step as a half-drawn character.
        */}
        <Label
          color="accent"
          style={{ fontSize: dimension * 0.4, lineHeight: dimension * 0.5 }}
        >
          {(name?.trim()[0] ?? "?").toUpperCase()}
        </Label>
      </Box>
    );
  }

  return (
    <Image
      source={source}
      accessibilityLabel={name ? `${name}'s avatar` : "Avatar"}
      style={[shared, { backgroundColor: theme.color.surfaceSunken }]}
      contentFit="cover"
      // Phase 6 prefetches the next few deck avatars through this cache.
      cachePolicy="memory-disk"
    />
  );
}
