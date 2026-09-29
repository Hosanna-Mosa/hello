import "../../global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ActiveCallBar } from "@/components/common/organisms/ActiveCallBar";
import { IncomingCallBar } from "@/components/common/organisms/IncomingCallBar";
import { IncomingCallOverlay } from "@/components/common/organisms/IncomingCallOverlay";
/*
  Imported for its side effect: registering the `call:incoming` listener. A call
  is the one flow that starts with the OTHER person acting, so something
  always-mounted has to be listening. It no longer navigates — it sets state,
  and `IncomingCallOverlay` below renders from it.
*/
import "@/stores/calls.store";
/*
  Same reason: the call in progress lives here, with its socket listeners
  (accepted / signal / ended), so it survives leaving the call screen.
*/
import "@/stores/activeCall.store";
import { useSessionStore } from "@/stores/session.store";
import { useUiStore } from "@/stores/ui.store";
import { ThemedStatusBar } from "@/theme/ThemedStatusBar";
import { ThemeProvider } from "@/theme/ThemeProvider";

// Hold the native splash until we know where the user belongs. Without this the
// app renders for a beat before `hydrate()` resolves.
void SplashScreen.preventAutoHideAsync();

/**
 * Root layout.
 *
 * Gating is `<Stack.Protected guard={…}>`, NOT an effect that watches segments
 * and calls `router.replace`. That pattern is obsolete in expo-router 57.
 *
 * NOTE — why `(auth)` is also guarded on "loading":
 * every guard being false means NO route matches, and expo-router falls through
 * to `+not-found`. On launch `status` is "loading", so the app opened on "Not
 * found" — a green build, every test passing, and the wrong screen. Caught only
 * by running it. Keeping `(auth)` mounted during hydration guarantees a match,
 * and the splash above covers it so nothing flashes.
 */
export default function RootLayout() {
  const status = useSessionStore((state) => state.status);
  const hydrate = useSessionStore((state) => state.hydrate);
  const themeOverride = useUiStore((state) => state.themeOverride);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const ready = status !== "loading";

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider override={themeOverride ?? undefined}>
          <ThemedStatusBar />

          {/*
            BEFORE <Stack>, as a sibling, so it pushes every screen down rather
            than covering its header. Renders nothing unless a call is running
            and you are somewhere other than the call screen.
          */}
          <ActiveCallBar />
          {/* The same strip for a ring you backed out of without answering. */}
          <IncomingCallBar />

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={status === "signedOut" || status === "loading"}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>

            <Stack.Protected guard={status === "onboarding"}>
              <Stack.Screen name="(onboarding)" />
            </Stack.Protected>

            <Stack.Protected guard={status === "signedIn"}>
              <Stack.Screen name="(tabs)" />

              {/* Home satellites — pushed over the tabs. */}
              <Stack.Screen name="search" />
              <Stack.Screen name="likes" />
              <Stack.Screen name="notifications" />

              {/*
                Native form sheets. `presentation: 'formSheet'` plus
                `sheetAllowedDetents` is built in and needs no bottom-sheet
                library (PLAN §2).
              */}
              {/*
                Filters is a full screen, per the design — not the form sheet
                Phase 5 first shipped. Its two sub-screens push on top.
              */}
              <Stack.Screen name="filters" />
              <Stack.Screen name="filters/interests" />
              <Stack.Screen name="filters/genders" />
              {/*
                Sized to its content, not to a fraction of the screen — a
                profile is as long as the person made it.

                This needs `fitToContents` on `SheetShell` too, and it needs
                `plugins/withSheetDialogTheme`: the wrapper this produces has
                NO height by design, so whatever is behind it shows, and the
                Material defaults behind it were white (PLAN #153).
              */}
              <Stack.Screen
                name="user/[id]"
                options={{ presentation: "formSheet", sheetAllowedDetents: "fitToContents" }}
              />
              <Stack.Screen
                name="like-note/[id]"
                options={{ presentation: "formSheet", sheetAllowedDetents: [0.6] }}
              />

              {/* A conversation is a normal push over the tabs. */}
              <Stack.Screen name="thread/[id]" />

              {/* Profile satellites and the settings tree — all plain pushes. */}
              <Stack.Screen name="edit-profile/index" />
              <Stack.Screen name="edit-profile/avatar" />
              <Stack.Screen name="edit-profile/bio" />
              <Stack.Screen name="edit-profile/interests" />

              <Stack.Screen name="settings/index" />
              <Stack.Screen name="settings/account" />
              <Stack.Screen name="settings/discovery" />
              <Stack.Screen name="settings/notifications" />
              <Stack.Screen name="settings/blocked" />
              <Stack.Screen name="settings/safety" />
              <Stack.Screen name="settings/help" />
              <Stack.Screen name="settings/legal" />
              <Stack.Screen name="settings/delete-account" />
              <Stack.Screen name="settings/subscription" />

              {/*
                The paywall is a sheet for the same reason reporting is: it is
                something you do *about* the screen behind it, and burying that
                screen in the back stack mid-decision is how people lose their
                place and leave.
              */}
              <Stack.Screen
                name="paywall"
                options={{ presentation: "formSheet", sheetAllowedDetents: [0.9] }}
              />

              {/*
                Reporting is a sheet, not a push: it is something you do *about*
                the screen behind it, and it must not bury that screen in the
                back stack while you are mid-report.
              */}
              <Stack.Screen
                name="report/[id]"
                options={{ presentation: "formSheet", sheetAllowedDetents: [0.9] }}
              />

              {/*
                Calls take the whole screen, including on iOS where a formSheet
                would leave the tab bar peeking out underneath. `fullScreenModal`
                is also what makes the platform treat hardware back as
                "dismiss the call", not "go back a tab".
              */}
              <Stack.Screen
                name="call/[id]"
                options={{ presentation: "fullScreenModal", animation: "fade" }}
              />
              <Stack.Screen
                name="incoming-call/[id]"
                options={{ presentation: "fullScreenModal", animation: "fade" }}
              />

              {/*
                The celebration sits over the deck rather than replacing it, so
                it reads as something that happened rather than somewhere you
                navigated.
              */}
              <Stack.Screen
                name="matched/[id]"
                options={{ presentation: "transparentModal", animation: "fade" }}
              />
            </Stack.Protected>

            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>

          {/*
            AFTER <Stack>, on purpose. A ringing phone must appear over whatever
            screen you are on, and it used to be a `router.push` from the socket
            handler — which made it a navigation event, so it showed only when
            the Chat tab happened to be open and vanished on moving away
            (PLAN #205). Rendered here it is state, above everything including
            the native tab bar, and renders nothing at all when nobody is
            calling — which is almost always.
          */}
          <IncomingCallOverlay />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
