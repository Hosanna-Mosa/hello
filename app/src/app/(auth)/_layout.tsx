import { Stack } from "expo-router";

/**
 * The signed-out stack.
 *
 * Headers are off throughout: every screen here draws its own back chevron
 * inside `ScreenShell`, so a native header would double up.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
