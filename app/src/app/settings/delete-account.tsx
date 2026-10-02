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
  SelectableRow,
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
  const deleteAccount = useSessionStore((state) => state.deleteAccount);

  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = typed.trim().toUpperCase() === copy.settings.deleteConfirmWord;

  async function destroy() {
    setDeleting(true);
    setError(null);
    try {
      /*
       * Deletes on the server (instant — the server keeps an archived copy),
       * then signs this device out. On success the root layout's
       * `Stack.Protected` guard swaps to the signed-out group by itself.
       */
      await deleteAccount(reason ?? undefined);
    } catch (e) {
      // Still signed in, account untouched — say so, and let them retry.
      setError(e instanceof Error && e.message ? e.message : copy.settings.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  function reasonStep() {
    return (
      <>
        <SectionHeader title={copy.settings.deleteReasonPrompt} />

        <Box style={{ gap: theme.spacing.sm }}>
          {copy.settings.deleteReasons.map((option) => (
            <SelectableRow
              key={option}
              label={option}
              selected={option === reason}
              onPress={() => setReason(option)}
            />
          ))}
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

        {error ? <Caption color="danger">{error}</Caption> : null}
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
