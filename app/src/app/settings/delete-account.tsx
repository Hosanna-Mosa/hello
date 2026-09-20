import { router } from "expo-router";
import { useState } from "react";

import {
  BareInput,
  Body,
  Box,
  Button,
  Caption,
  Icon,
  Label,
  ScreenShell,
  Scroller,
  SectionHeader,
  Tappable,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { useSessionStore } from "@/stores/session.store";

type Step = "reason" | "consequences" | "confirm";

/**
 * Delete account — reason, then consequences, then a typed confirmation.
 *
 * Three steps rather than one dialog, and deliberately slow. This is the only
 * irreversible action in the product that cannot be undone by the other person
 * changing their mind, and a typed word is the standard way to make sure the
 * hand that pressed it meant to.
 *
 * The reason is asked first because it is the only step that might change the
 * answer — someone leaving over a bad experience should be reading about
 * blocking and reporting, not about deletion.
 */
export default function DeleteAccountScreen() {
  const theme = useTheme();
  const signOut = useSessionStore((state) => state.signOut);

  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmed = typed.trim().toUpperCase() === copy.settings.deleteConfirmWord;

  async function destroy() {
    setDeleting(true);
    try {
      /*
       * There is no `deleteAccount` in the service layer and there should not
       * be: every byte of this app's data is in memory (R7), so signing out is
       * already a complete erasure. A mock "delete" endpoint would be theatre
       * that does strictly less than this.
       */
      await signOut();
    } finally {
      setDeleting(false);
    }
  }

  function reasonStep() {
    return (
      <>
        <SectionHeader title={copy.settings.deleteReasonPrompt} />

        <Box style={{ gap: theme.spacing.sm }}>
          {copy.settings.deleteReasons.map((option) => {
            const selected = option === reason;

            return (
              <Tappable
                key={option}
                onPress={() => setReason(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                  minHeight: 56,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: selected ? theme.color.accent : theme.color.border,
                  backgroundColor: selected ? theme.color.accentMuted : theme.color.surface,
                }}
              >
                <Body style={{ flex: 1 }}>{option}</Body>
                {selected ? (
                  <Icon
                    name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
                    size={20}
                    color="accent"
                  />
                ) : null}
              </Tappable>
            );
          })}
        </Box>
      </>
    );
  }

  function consequencesStep() {
    return (
      <>
        <Body style={{ fontSize: 16, lineHeight: 24 }}>{copy.settings.deleteBody}</Body>

        <Box style={{ gap: theme.spacing.md, paddingTop: theme.spacing.sm }}>
          {copy.settings.deleteConsequences.map((line) => (
            <Box
              key={line}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}
            >
              <Box style={{ paddingTop: 2 }}>
                <Icon
                  name={{ ios: "exclamationmark.triangle.fill", android: "warning" }}
                  size={18}
                  color="danger"
                />
              </Box>
              <Body color="textSecondary" style={{ flex: 1 }}>
                {line}
              </Body>
            </Box>
          ))}
        </Box>
      </>
    );
  }

  function confirmStep() {
    return (
      <>
        <Label>{copy.settings.deleteConfirmPrompt}</Label>

        <BareInput
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={copy.settings.deleteConfirmPrompt}
          placeholder={copy.settings.deleteConfirmWord}
          style={{
            minHeight: 52,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: confirmed ? theme.color.danger : theme.color.border,
            backgroundColor: theme.color.surface,
            paddingHorizontal: theme.spacing.lg,
            fontSize: 16,
            letterSpacing: 2,
          }}
        />

        <Caption>{copy.settings.deleteBody}</Caption>
      </>
    );
  }

  function footer() {
    if (step === "reason") {
      return (
        <Button
          label={copy.common.continue}
          onPress={() => setStep("consequences")}
          disabled={!reason}
        />
      );
    }

    if (step === "consequences") {
      return (
        <Button
          label={copy.common.continue}
          onPress={() => setStep("confirm")}
          variant="destructive"
        />
      );
    }

    return (
      <Button
        label={copy.settings.deleteFinal}
        onPress={() => void destroy()}
        variant="destructive"
        disabled={!confirmed}
        loading={deleting}
      />
    );
  }

  return (
    <ScreenShell
      title={copy.settings.deleteTitle}
      onBack={() => {
        if (step === "confirm") return setStep("consequences");
        if (step === "consequences") return setStep("reason");
        return router.back();
      }}
    >
      <Scroller
        contentContainerStyle={{
          padding: theme.spacing.xl,
          gap: theme.spacing.lg,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {step === "reason" ? reasonStep() : null}
        {step === "consequences" ? consequencesStep() : null}
        {step === "confirm" ? confirmStep() : null}
      </Scroller>

      <Box style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        {footer()}
      </Box>
    </ScreenShell>
  );
}
