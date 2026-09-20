/**
 * Country dial-code selector.
 *
 * A short, deliberately incomplete list — the real one belongs with the real
 * backend, and a 200-row picker is not what this phase is testing. Flags are
 * emoji rather than image assets: they render on both platforms, scale with
 * Dynamic Type, and add no files.
 */

import { useState } from "react";
import { Modal } from "react-native";

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Divider } from "@/components/common/atoms/Divider";
import { Heading } from "@/components/common/atoms/Heading";
import { Icon } from "@/components/common/atoms/Icon";
import { Label } from "@/components/common/atoms/Label";
import { Scroller } from "@/components/common/atoms/Scroller";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type Country = { code: string; dial: string; flag: string; name: string };

export const COUNTRIES: Country[] = [
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export type CountryPickerProps = {
  value: Country;
  onChange: (country: Country) => void;
};

export function CountryPicker({ value, onChange }: CountryPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tappable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Country code, ${value.name}, ${value.dial}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          borderWidth: 1,
          borderColor: theme.color.border,
          borderRadius: theme.radius.sm,
          paddingHorizontal: theme.spacing.md,
          minHeight: 56,
          backgroundColor: theme.color.surface,
        }}
      >
        <Body>{value.flag}</Body>
        <Body strong>{value.dial}</Body>
        <Icon name={{ ios: "chevron.down", android: "expand_more" }} size={14} color="textSecondary" />
      </Tappable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Tappable
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
          style={{ flex: 1, backgroundColor: theme.color.overlay, justifyContent: "flex-end" }}
        >
          <Box
            style={{
              backgroundColor: theme.color.surfaceElevated,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              maxHeight: "70%",
              paddingTop: theme.spacing.lg,
            }}
          >
            <Heading level="title" style={{ paddingHorizontal: theme.spacing.xl }}>
              Country
            </Heading>

            <Scroller contentContainerStyle={{ paddingVertical: theme.spacing.md }}>
              {COUNTRIES.map((country) => (
                <Box key={country.code}>
                  <Tappable
                    onPress={() => {
                      onChange(country);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: country.code === value.code }}
                    accessibilityLabel={`${country.name} ${country.dial}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.md,
                      paddingHorizontal: theme.spacing.xl,
                      minHeight: 48,
                    }}
                  >
                    <Body>{country.flag}</Body>
                    <Body style={{ flex: 1 }}>{country.name}</Body>
                    <Label color="textSecondary">{country.dial}</Label>
                  </Tappable>
                  <Divider inset={theme.spacing.xl} />
                </Box>
              ))}
            </Scroller>
          </Box>
        </Tappable>
      </Modal>
    </>
  );
}
