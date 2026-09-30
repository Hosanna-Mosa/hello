/**
 * The profile sheet's footer: what you can do with this person right now.
 *
 * One primary action per connection state (see `ConnectionStatus`):
 *
 *   none       "Send request" → a note field, then Send. The note is what makes
 *              it a REQUEST the other person can accept (a like without one is
 *              silent), so it opens pre-filled rather than empty.
 *   requested  "Request sent", disabled — and it stays that way even if they
 *              declined, because a sender is never told (A18).
 *   incoming   "Accept request" → match → becomes "Message".
 *   matched    "Message" → the conversation.
 *
 * Messaging is match-gated (PLAN §1): there is no path to "Message" that does
 * not go through the other person saying yes.
 */

import { useState } from "react";

import { Box } from "@/components/common/atoms/Box";
import { Caption } from "@/components/common/atoms/Caption";
import { Input } from "@/components/common/atoms/Input";
import { Label } from "@/components/common/atoms/Label";
import { useTheme } from "@/components/common/hooks/useTheme";
import { Button } from "@/components/common/molecules/Button";
import { copy } from "@/copy";
import type { ConnectionStatus } from "@/services/types";

const NOTE_MAX = 200;

export type ConnectionActionsProps = {
  /** `undefined` while still checking — nothing is shown rather than a wrong button. */
  status: ConnectionStatus | undefined;
  name: string;
  busy: boolean;
  error: string | null;
  onMessage: () => void;
  onAccept: () => void;
  onSendRequest: (note: string) => void;
};

export function ConnectionActions({ status, name, busy, error, onMessage, onAccept, onSendRequest }: ConnectionActionsProps) {
  const theme = useTheme();
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState("");

  if (status === undefined) return null;

  const errorLine = error ? (
    <Caption color="danger" accessibilityLiveRegion="polite" style={{ textAlign: "center" }}>
      {error}
    </Caption>
  ) : null;

  if (status === "matched") return <Button label={copy.profile.message} onPress={onMessage} />;

  if (status === "incoming") {
    return (
      <Box style={{ gap: theme.spacing.sm }}>
        {errorLine}
        <Button label={copy.profile.acceptRequest} onPress={onAccept} loading={busy} />
      </Box>
    );
  }

  if (status === "requested") {
    return (
      <Box style={{ gap: theme.spacing.sm }}>
        <Button label={copy.profile.requestSent} onPress={() => {}} variant="secondary" disabled />
        <Caption style={{ textAlign: "center" }}>{copy.profile.requestSentHint}</Caption>
      </Box>
    );
  }

  if (!composing) {
    return (
      <Button
        label={copy.profile.sendRequest}
        onPress={() => {
          setNote(copy.profile.requestNoteDefault(name));
          setComposing(true);
        }}
      />
    );
  }

  return (
    <Box style={{ gap: theme.spacing.sm }}>
      <Label>{copy.profile.requestNoteLabel}</Label>
      <Input
        value={note}
        onChangeText={setNote}
        placeholder={copy.profile.requestNotePlaceholder}
        accessibilityLabel={copy.profile.requestNoteLabel}
        multiline
        maxLength={NOTE_MAX}
        autoFocus
        style={{ minHeight: 88, textAlignVertical: "top" }}
      />
      {errorLine}
      <Button
        label={copy.profile.sendRequestConfirm}
        onPress={() => onSendRequest(note.trim())}
        disabled={note.trim().length === 0}
        loading={busy}
      />
    </Box>
  );
}
