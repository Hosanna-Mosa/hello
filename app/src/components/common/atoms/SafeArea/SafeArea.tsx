/**
 * `SafeAreaView` from `react-native-safe-area-context`.
 *
 * Structural: this belongs in a template, never scattered through screens.
 * Nesting safe areas is the usual cause of doubled top padding.
 *
 * Uses the context package rather than RN's own `SafeAreaView`, which is
 * iOS-only and deprecated. Requires `SafeAreaProvider` to be mounted in the
 * root layout — expo-router is not documented to mount it for us.
 */

import { SafeAreaView, type SafeAreaViewProps } from "react-native-safe-area-context";

export type SafeAreaProps = SafeAreaViewProps;

export function SafeArea(props: SafeAreaProps) {
  return <SafeAreaView {...props} />;
}
