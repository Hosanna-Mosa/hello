import { router } from "expo-router";
import * as Location from "expo-location";

import {
  Body,
  Box,
  Button,
  Heading,
  Label,
  Picture,
  Tappable,
  usePermission,
  useTheme,
  WizardShell,
} from "@/components/common";
import { copy } from "@/copy";
import { meService } from "@/services/me.service";
import { useSessionStore } from "@/stores/session.store";

const MAP = require("@/assets/images/illustrations/location.png");

/**
 * The last onboarding step: the location primer.
 *
 * This is the app's own screen, shown BEFORE any OS dialog (PLAN Phase 4). Both
 * platforms stop showing the system prompt after a refusal and iOS allows one
 * ask ever, so spending it without explaining what it is for is how apps end up
 * permanently denied.
 *
 * Three ways forward and none of them is a dead end: allow, not now, or type a
 * city. Finishing onboarding does not depend on granting anything.
 */
export default function LocationScreen() {
  const theme = useTheme();
  const completeOnboarding = useSessionStore((state) => state.completeOnboarding);

  const permission = usePermission({
    get: async () => {
      const { granted, canAskAgain } = await Location.getForegroundPermissionsAsync();
      return { granted, canAskAgain };
    },
    request: async () => {
      const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      return { granted, canAskAgain };
    },
  });

  async function finish() {
    // Completing flips the session to "signedIn"; the root layout's
    // Stack.Protected guard swaps the group. No router.replace.
    await completeOnboarding();
  }

  async function allow() {
    await permission.request();

    // A coarse coordinate only.
    if (permission.state !== "blocked") {
      try {
        // `getLastKnownPositionAsync` reads a CACHED fix and returns null when
        // there isn't one — which is common on a phone that has just booted, or
        // one that has not used location recently. Relying on it alone means
        // granting permission still saves nothing, and the server then has no
        // coordinate to measure distance from.
        //
        // So fall back to actually acquiring one. `Low` accuracy is deliberate:
        // it is fast, cheap on battery, and this product only ever shows
        // distance rounded to the nearest kilometre.
        const position =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));

        if (position) {
          await meService.updateMe({
            location: {
              coordinate: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
            },
          });
        }
      } catch {
        // A refused or unavailable fix must not block finishing onboarding.
      }
    }

    await finish();
  }

  return (
    <WizardShell
      step={7}
      total={7}
      question=""
      onBack={() => router.back()}
      scroll={false}
      footer={
        <>
          <Button
            label={copy.onboarding.locationAllow}
            onPress={allow}
            loading={permission.state === "pending"}
          />
          <Button label={copy.common.notNow} onPress={finish} variant="secondary" />

          <Box style={{ alignItems: "center", paddingTop: theme.spacing.xs }}>
            <Tappable
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel={copy.onboarding.locationManual}
              hitSlop={12}
            >
              <Label color="textSecondary" style={{ textDecorationLine: "underline" }}>
                {copy.onboarding.locationManual}
              </Label>
            </Tappable>
          </Box>
        </>
      }
    >
      <Box style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.lg }}>
        <Picture
          source={MAP}
          contentFit="contain"
          style={{ width: "100%", height: 240 }}
          accessibilityLabel="A map with a location pin and two people nearby"
        />

        <Heading level="heading" style={{ textAlign: "center" }}>
          {copy.onboarding.locationQuestion}
        </Heading>

        <Body color="textSecondary" style={{ textAlign: "center", fontSize: 16, lineHeight: 24 }}>
          {permission.mustOpenSettings
            ? copy.onboarding.locationBlocked
            : copy.onboarding.locationBody}
        </Body>
      </Box>
    </WizardShell>
  );
}
