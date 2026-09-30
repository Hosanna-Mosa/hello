import { router } from "expo-router";
import { useState } from "react";

import {
  BareInput,
  Box,
  Button,
  Caption,
  Input,
  Label,
  ScreenShell,
  Scroller,
  SelectableRow,
  useKeyboardInset,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { MESSAGE_MAX, SUBJECT_MAX, SUBJECT_MIN, SUPPORT_CATEGORIES } from "@/services/support.service";
import type { SupportCategory } from "@/services/types";
import { useSupportStore } from "@/stores/support.store";

/**
 * Open a support ticket: what it's about, a subject, and the problem.
 *
 * One screen, not a wizard — the three fields are short, and seeing them
 * together tells the person how much we need before they start. On success
 * this screen is REPLACED by the new ticket's conversation, so "back" from
 * there goes to the list rather than to a form that was already sent.
 */
export default function NewSupportTicketScreen() {
  const theme = useTheme();
  const keyboardInset = useKeyboardInset();
  const createTicket = useSupportStore((state) => state.createTicket);

  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [touchedSubject, setTouchedSubject] = useState(false);

  const subjectOk = subject.trim().length >= SUBJECT_MIN;
  const canSubmit = category !== null && subjectOk && message.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit || !category) return;
    setSubmitting(true);
    setFailed(false);
    try {
      const ticket = await createTicket({ category, subject: subject.trim(), message: message.trim() });
      router.replace({ pathname: "/support/[id]", params: { id: ticket.id } });
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenShell title={copy.support.newTitle} onBack={() => router.back()}>
      <Box style={{ flex: 1, paddingBottom: keyboardInset }}>
        <Scroller
          contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Label>{copy.support.categoryLabel}</Label>
          <Box style={{ gap: theme.spacing.sm }}>
            {SUPPORT_CATEGORIES.map((option) => (
              <SelectableRow
                key={option}
                label={copy.support.category[option]}
                selected={option === category}
                onPress={() => setCategory(option)}
              />
            ))}
          </Box>

          <Label>{copy.support.subjectLabel}</Label>
          <Input
            value={subject}
            onChangeText={setSubject}
            onBlur={() => setTouchedSubject(true)}
            placeholder={copy.support.subjectPlaceholder}
            accessibilityLabel={copy.support.subjectLabel}
            maxLength={SUBJECT_MAX}
            invalid={touchedSubject && !subjectOk}
            returnKeyType="next"
          />
          {touchedSubject && !subjectOk ? <Caption color="danger">{copy.support.subjectTooShort}</Caption> : null}

          <Label>{copy.support.messageLabel}</Label>
          <BareInput
            value={message}
            onChangeText={setMessage}
            placeholder={copy.support.messagePlaceholder}
            accessibilityLabel={copy.support.messageLabel}
            multiline
            maxLength={MESSAGE_MAX}
            style={{
              minHeight: 160,
              borderRadius: theme.radius.md,
              backgroundColor: theme.color.surfaceSunken,
              padding: theme.spacing.lg,
              textAlignVertical: "top",
              fontSize: 16,
              lineHeight: 24,
            }}
          />
          <Box style={{ alignItems: "flex-end" }}>
            <Caption>{copy.support.charactersLeft(message.length, MESSAGE_MAX)}</Caption>
          </Box>

          {failed ? (
            <Caption color="danger" accessibilityLiveRegion="polite">
              {copy.support.createFailed}
            </Caption>
          ) : null}
        </Scroller>

        <Box style={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
          <Button label={copy.support.submit} onPress={() => void submit()} disabled={!canSubmit} loading={submitting} />
        </Box>
      </Box>
    </ScreenShell>
  );
}
