/**
 * A three-column date wheel: month, day, year.
 *
 * Built rather than borrowed. `@expo/ui` ships a native date picker, but it
 * renders as the platform's own control — which would look nothing like the
 * approved design on either platform, and different again between them. Three
 * snapping scrollers match the design exactly, cost no dependency, and put the
 * selected value entirely under our control, which the 18+ gate needs.
 *
 * The centre band is a highlight drawn behind the rows, not a selected item, so
 * the selection stays visually fixed while the numbers move past it.
 */

import { useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { Body } from "@/components/common/atoms/Body";
import { Box } from "@/components/common/atoms/Box";
import { Scroller } from "@/components/common/atoms/Scroller";
import { useTheme } from "@/components/common/hooks/useTheme";

const ROW_HEIGHT = 48;
const VISIBLE_ROWS = 5;
const PAD_ROWS = (VISIBLE_ROWS - 1) / 2;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type DateWheelProps = {
  value: Date;
  onChange: (next: Date) => void;
  /** Oldest selectable year. */
  minYear?: number;
  /** Newest selectable year. Defaults to this year. */
  maxYear?: number;
};

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function DateWheel({
  value,
  onChange,
  minYear = new Date().getFullYear() - 100,
  maxYear = new Date().getFullYear(),
}: DateWheelProps) {
  const theme = useTheme();
  const settling = useRef(false);

  const year = value.getFullYear();
  const month = value.getMonth();
  const day = value.getDate();

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);

  function commit(nextYear: number, nextMonth: number, nextDay: number) {
    // Clamp the day when the month changes: 31 January → February is the 28th,
    // not a rolled-over 3 March.
    const maxDay = daysInMonth(nextYear, nextMonth);
    onChange(new Date(nextYear, nextMonth, Math.min(nextDay, maxDay)));
  }

  function column<T>(
    items: T[],
    selectedIndex: number,
    label: (item: T) => string,
    onSelect: (index: number) => void,
    testLabel: string,
  ) {
    function onEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
      if (settling.current) return;
      const index = Math.round(event.nativeEvent.contentOffset.y / ROW_HEIGHT);
      const clamped = Math.min(Math.max(index, 0), items.length - 1);
      if (clamped !== selectedIndex) onSelect(clamped);
    }

    return (
      <Scroller
        accessibilityLabel={testLabel}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: selectedIndex * ROW_HEIGHT }}
        onMomentumScrollEnd={onEnd}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: PAD_ROWS * ROW_HEIGHT }}
      >
        {items.map((item, index) => (
          <Box
            key={label(item)}
            style={{ height: ROW_HEIGHT, alignItems: "center", justifyContent: "center" }}
          >
            <Body
              strong={index === selectedIndex}
              color={index === selectedIndex ? "textPrimary" : "textTertiary"}
              style={{ fontSize: index === selectedIndex ? 20 : 18, lineHeight: 28 }}
            >
              {label(item)}
            </Body>
          </Box>
        ))}
      </Scroller>
    );
  }

  return (
    <Box style={{ height: ROW_HEIGHT * VISIBLE_ROWS }}>
      {/* Selection band, drawn behind the columns. */}
      <Box
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{
          position: "absolute",
          top: PAD_ROWS * ROW_HEIGHT,
          left: 0,
          right: 0,
          height: ROW_HEIGHT,
          borderRadius: theme.radius.md,
          backgroundColor: theme.color.accentMuted,
        }}
      />

      <Box style={{ flexDirection: "row", flex: 1 }}>
        {column(MONTHS, month, (m) => m, (i) => commit(year, i, day), "Month")}
        {column(days, day - 1, (d) => String(d), (i) => commit(year, month, i + 1), "Day")}
        {column(years, years.indexOf(year), (y) => String(y), (i) => commit(years[i], month, day), "Year")}
      </Box>
    </Box>
  );
}
