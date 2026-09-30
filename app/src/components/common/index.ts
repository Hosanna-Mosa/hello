/**
 * The shared kit's public surface.
 *
 * Screens import from here, never from a component's own folder. That keeps
 * every import in `src/app/**` one line long and makes a move inside
 * `components/common/` invisible to the routes.
 *
 * INVARIANT: nothing exported from this barrel may import `expo-router`.
 * Re-exporting a navigation-aware module here pulls expo-router's untransformed
 * `standard-navigation` dependency into every suite that touches the kit, and
 * the pure atom tests fail at parse time with "Cannot use import statement
 * outside a module" — a long way from the actual cause. Two members are
 * deliberately absent for this reason and are imported by path instead:
 * `hooks/useFocusLoad` (PLAN parking #58) and the `AdSlot` / `AdBanner` /
 * `AdCard` / `AdRow` family, whose slot reads the current route.
 */

// --- primitive wrappers: one thin layer over React Native ---
export { Body, type BodyProps } from "./atoms/Body";
export { Box, type BoxProps } from "./atoms/Box";
export { BareInput, type BareInputHandle, type BareInputProps } from "./atoms/BareInput";
export { Caption, type CaptionProps } from "./atoms/Caption";
export { Heading, type HeadingProps } from "./atoms/Heading";
export { Input, type InputProps } from "./atoms/Input";
export { KeyboardAware, type KeyboardAwareProps } from "./atoms/KeyboardAware";
export { Label, type LabelProps } from "./atoms/Label";
export { List, type ListHandle, type ListProps } from "./atoms/List";
export { Picture, type PictureProps } from "./atoms/Picture";
export { SafeArea, type SafeAreaProps } from "./atoms/SafeArea";
export { Sheet, type SheetProps } from "./atoms/Sheet";
export { Scroller, type ScrollerProps } from "./atoms/Scroller";
export { SectionedList, type SectionedListProps } from "./atoms/SectionedList";
export { Spinner, type SpinnerProps } from "./atoms/Spinner";
export { Tappable, type TappableProps } from "./atoms/Tappable";
export { Toggle, type ToggleProps } from "./atoms/Toggle";
export { Touchable, type TouchableProps } from "./atoms/Touchable";

// --- app atoms ---
export { Avatar, type AvatarProps, type AvatarSize, type AvatarSource } from "./atoms/Avatar";
export { Badge, type BadgeProps } from "./atoms/Badge";
export { Chip, type ChipProps } from "./atoms/Chip";
export { Divider, type DividerProps } from "./atoms/Divider";
export { Icon, type IconName, type IconProps } from "./atoms/Icon";
export { Stamp, type StampKind, type StampProps } from "./atoms/Stamp";

// --- molecules ---
export { BenefitList } from "./molecules/BenefitList";
export { Button, type ButtonProps, type ButtonVariant } from "./molecules/Button";
export { Card, type CardProps } from "./molecules/Card";
export { ChatBubble, type ChatBubbleProps } from "./molecules/ChatBubble";
export { DaySeparator, type DaySeparatorProps } from "./molecules/DaySeparator";
export { DistanceLabel, type DistanceLabelProps } from "./molecules/DistanceLabel";
export { EmptyState, type EmptyStateProps } from "./molecules/EmptyState";
export { ErrorState, type ErrorStateProps } from "./molecules/ErrorState";
export { InterestText, type InterestTextProps } from "./molecules/InterestText";
export { ListRow, type ListRowProps } from "./molecules/ListRow";
export { NearbySkeleton, type NearbySkeletonProps } from "./molecules/NearbySkeleton";
export { RangeSlider, type RangeSliderProps } from "./molecules/RangeSlider";
export { SectionHeader, type SectionHeaderProps } from "./molecules/SectionHeader";
export { SelectableRow, type SelectableRowProps } from "./molecules/SelectableRow";
export { SettingsRow, type SettingsRowProps } from "./molecules/SettingsRow";
export { Skeleton, type SkeletonProps } from "./molecules/Skeleton";
export { SupportStatusPill, type SupportStatusPillProps } from "./molecules/SupportStatusPill";
export { SystemMessage, type SystemMessageProps } from "./molecules/SystemMessage";
export { ThreadSkeleton, type ThreadSkeletonProps } from "./molecules/ThreadSkeleton";
export { ToggleRow, type ToggleRowProps } from "./molecules/ToggleRow";
export { WizardProgress, type WizardProgressProps } from "./molecules/WizardProgress";

// --- organisms ---
export { AvatarPicker, type AvatarOption, type AvatarPickerProps } from "./organisms/AvatarPicker";
export { ChatComposer, type ChatComposerProps, type ComposerVoice } from "./organisms/ChatComposer";
export { ConfirmDialog, type ConfirmDialogProps } from "./organisms/ConfirmDialog";
// IncomingCallOverlay / IncomingCallPanel are deliberately NOT re-exported
// here. The overlay reaches for `expo-router`, and this barrel is imported by
// the pure-UI tests — which then fail to parse `standard-navigation`, an ESM
// package Jest does not transform. Import them by path.
export { InterestPicker, type InterestPickerProps } from "./organisms/InterestPicker";

// --- templates ---
export { CallShell, type CallShellProps } from "./templates/CallShell";
export { FormShell, type FormShellProps } from "./templates/FormShell";
export { ListScreenShell, type ListScreenShellProps } from "./templates/ListScreenShell";
export { ScreenShell, type ScreenShellProps } from "./templates/ScreenShell";
export { SheetShell, type SheetShellProps } from "./templates/SheetShell";
export { TabScreenShell, type TabScreenShellProps } from "./templates/TabScreenShell";
export { WizardShell, type WizardShellProps } from "./templates/WizardShell";

// --- hooks ---
export { useAsyncStatus, type AsyncStatus, type AsyncStatusInput } from "./hooks/useAsyncStatus";
export { useCountdown, formatCountdown } from "./hooks/useCountdown";
export { useDebouncedValue } from "./hooks/useDebouncedValue";
export { useBottomInset } from "./hooks/useBottomInset";
export { useKeyboardInset } from "./hooks/useKeyboardInset";
export {
  useEntitlements,
  type EntitlementsView,
} from "./hooks/useEntitlements";
export {
  usePermission,
  type PermissionApi,
  type PermissionResult,
  type PermissionState,
} from "./hooks/usePermission";
export { usePullToRefresh } from "./hooks/usePullToRefresh";
export {
  useSearchFilter,
  type UseSearchFilterOptions,
} from "./hooks/useSearchFilter";
export {
  useSession,
  useSessionStore,
  type SessionState,
  type SessionStatus,
} from "./hooks/useSession";
export { useTheme } from "./hooks/useTheme";

// --- utils ---
export { calculateAge, isOldEnough, MINIMUM_AGE } from "./utils/calculateAge";
export { formatDistance, type DistanceUnit } from "./utils/formatDistance";
export {
  formatClockTime,
  formatDayLabel,
  isNewDay,
} from "./utils/formatMessageTime";
export { formatRelativeTime } from "./utils/formatRelativeTime";
export { formatRupees } from "./utils/formatRupees";
export {
  profileCompleteness,
  profileCompletenessPercent,
  MINIMUM_INTERESTS,
  type CompletableProfile,
} from "./utils/profileCompleteness";
