/**
 * A status change in the conversation — "Support marked this issue as
 * resolved", "Resolved — this ticket is now closed", "Not resolved yet".
 *
 * Rendered from the EVENT with the app's own copy, not from the server's text,
 * so the words match the rest of the app. The server's body is the fallback
 * for an event this build does not know yet.
 */

import type { IconName } from "@/components/common/atoms/Icon";
import { SystemMessage } from "@/components/common/molecules/SystemMessage";
import { copy } from "@/copy";
import type { SupportEvent } from "@/services/types";

const EVENT_ICON: Record<SupportEvent, IconName> = {
  resolutionRequested: { ios: "checkmark.seal", android: "task_alt" },
  resolutionAccepted: { ios: "checkmark.circle", android: "check_circle" },
  resolutionDeclined: { ios: "arrow.uturn.backward", android: "undo" },
};

const FALLBACK_ICON: IconName = { ios: "info.circle", android: "info" };

export type SupportEventLineProps = {
  event: SupportEvent | null;
  /** The server's wording, used only when `event` is unknown. */
  body: string;
};

export function SupportEventLine({ event, body }: SupportEventLineProps) {
  const known = event && event in EVENT_ICON ? event : null;
  return (
    <SystemMessage
      body={known ? copy.support.events[known] : body}
      icon={known ? EVENT_ICON[known] : FALLBACK_ICON}
    />
  );
}
