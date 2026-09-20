import { Stack } from "expo-router";

/**
 * Onboarding starts at `name`, not wherever the filesystem sorts first.
 *
 * The group has no `index` route, so expo-router fell back to the
 * alphabetically first file — `age-restricted`. Verifying the OTP dropped the
 * user straight onto the 18+ dead end: no way forward, no error, build green,
 * 232 tests passing. Only running it found this.
 *
 * `unstable_settings` alone did NOT fix it here, so the screens are declared
 * explicitly in wizard order as well — the first declared screen is the one the
 * stack opens on. Both are kept: the setting states the intent, the ordering
 * enforces it.
 *
 * Not solved by renaming `name.tsx` to `index.tsx`: a route file's path IS its
 * route, and that would change `/name` to `/`.
 */
export const unstable_settings = {
  initialRouteName: "name",
};

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="name" />
      <Stack.Screen name="birthday" />
      <Stack.Screen name="gender" />
      <Stack.Screen name="avatar" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="bio" />
      <Stack.Screen name="location" />

      {/*
        Terminal state. Gestures off so it cannot be swiped away — a dead end
        you can swipe out of is not a dead end.
      */}
      <Stack.Screen
        name="age-restricted"
        options={{ gestureEnabled: false, animation: "fade" }}
      />
    </Stack>
  );
}
