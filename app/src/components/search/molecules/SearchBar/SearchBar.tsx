/**
 * The search input.
 *
 * Clear button appears only with text in the box, and is 44pt despite looking
 * small — it sits next to the keyboard and is easy to miss otherwise.
 */

import { BareInput } from "@/components/common/atoms/BareInput";
import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type SearchBarProps = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search",
  autoFocus = false,
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <Box
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        backgroundColor: theme.color.surfaceSunken,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing.md,
        minHeight: 44,
      }}
    >
      <Icon name={{ ios: "magnifyingglass", android: "search" }} size={18} color="textTertiary" />

      <BareInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={{ flex: 1, paddingVertical: theme.spacing.sm }}
      />

      {value.length > 0 ? (
        <Tappable
          onPress={() => onChangeText("")}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={12}
        >
          <Icon name={{ ios: "xmark.circle.fill", android: "cancel" }} size={18} color="textTertiary" />
        </Tappable>
      ) : null}
    </Box>
  );
}
