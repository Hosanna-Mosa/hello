import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  BareInput,
  Body,
  Box,
  Button,
  Caption,
  Heading,
  Icon,
  Label,
  ScreenShell,
  Scroller,
  SelectableRow,
  ToggleRow,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { profilesService } from "@/services/profiles.service";
import { REPORT_REASONS, safetyService } from "@/services/safety.service";
import type { PublicProfile, ReportReason } from "@/services/types";

const MAX_DETAILS = 500;

type Step = "reason" | "details" | "done";

/**
 * Report someone.
 *
 * Three steps in one route rather than three routes: a report is abandoned
 * often, and every extra entry in the back stack is another way to end up
 * halfway through one with no idea how you got there.
 *
 * "Romantic or flirty advance" leads the list. That is the positioning, not a
 * nicety (PLAN §1) — a platonic product that buries it under "other" is only
 * claiming to be platonic.
 *
 * Reporting is fire-and-forget by design: the reporter is never told what
 * happened to the person they reported. That is both standard practice and the
 * safest thing for them.
 */
export default function ReportScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [person, setPerson] = useState<PublicProfile | null>(null);
  const [step, setStep] = useState<Step>("reason");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const profile = await profilesService.getProfile(id);
        if (!cancelled) setPerson(profile);
      } catch {
        // A report must still be fileable against someone who no longer
        // resolves — the name is decoration, the id is the report.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await safetyService.report(id, reason, details.trim() || undefined, alsoBlock);
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  }

  const name = person?.name ?? "";

  function reasonStep() {
    return (
      <>
        <Caption>{copy.safety.reportHint}</Caption>

        <Box style={{ gap: theme.spacing.sm }}>
          {REPORT_REASONS.map((option) => (
            <SelectableRow
              key={option.reason}
              label={option.label}
              selected={option.reason === reason}
              onPress={() => setReason(option.reason)}
            />
          ))}
        </Box>
      </>
    );
  }

  function detailsStep() {
    return (
      <>
        <Label>{copy.safety.reportDetails}</Label>

        <BareInput
          value={details}
          onChangeText={setDetails}
          placeholder={copy.safety.reportDetails}
          multiline
          maxLength={MAX_DETAILS}
          accessibilityLabel={copy.safety.reportDetails}
          style={{
            minHeight: 120,
            borderRadius: theme.radius.md,
            backgroundColor: theme.color.surfaceSunken,
            padding: theme.spacing.lg,
            textAlignVertical: "top",
            fontSize: 16,
            lineHeight: 24,
          }}
        />

        <Box style={{ alignItems: "flex-end" }}>
          <Caption>{`${details.length}/${MAX_DETAILS}`}</Caption>
        </Box>

        <ToggleRow
          label={copy.safety.alsoBlock}
          description={copy.safety.blockBody}
          value={alsoBlock}
          onValueChange={setAlsoBlock}
        />
      </>
    );
  }

  function doneStep() {
    return (
      <Box style={{ alignItems: "center", gap: theme.spacing.lg, paddingTop: theme.spacing.xxxl }}>
        <Box
          style={{
            width: 88,
            height: 88,
            borderRadius: theme.radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.color.secondaryMuted,
          }}
        >
          <Icon
            name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
            size={44}
            color="secondary"
          />
        </Box>

        <Heading level="title">{copy.safety.reportedTitle}</Heading>
        <Body color="textSecondary" style={{ textAlign: "center" }}>
          {copy.safety.reportedBody}
        </Body>
      </Box>
    );
  }

  function footer() {
    if (step === "reason") {
      return (
        <Button
          label={copy.common.continue}
          onPress={() => setStep("details")}
          disabled={!reason}
        />
      );
    }

    if (step === "details") {
      return (
        <Button
          label={copy.safety.reportSubmit}
          onPress={() => void submit()}
          variant="destructive"
          loading={submitting}
        />
      );
    }

    return <Button label={copy.common.done} onPress={() => router.back()} />;
  }

  return (
    <ScreenShell
      title={name ? `${copy.safety.reportTitle} ${name}` : copy.safety.reportTitle}
      // No way back out of the confirmation — the report is already filed.
      onBack={
        step === "done"
          ? undefined
          : () => (step === "details" ? setStep("reason") : router.back())
      }
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
        {step === "details" ? detailsStep() : null}
        {step === "done" ? doneStep() : null}
      </Scroller>

      <Box style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        {footer()}
      </Box>
    </ScreenShell>
  );
}
