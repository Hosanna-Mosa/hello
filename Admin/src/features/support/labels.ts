/** How support values read in the panel — one place, so every page says the same thing. */

import type { SupportCategory, SupportEvent, SupportTicketStatus } from "@/types/admin";

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  account: "Account & sign-in",
  technical: "Something isn't working",
  safety: "Safety & reporting",
  billing: "Subscription & billing",
  feedback: "Feedback & ideas",
  other: "Something else",
};

/**
 * From the operator's side. `pendingResolution` is "awaiting user": support
 * has done its part, and the ticket closes only when the user confirms.
 */
export const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Open",
  pendingResolution: "Awaiting user",
  resolved: "Resolved",
};

export const EVENT_LABEL: Record<SupportEvent, string> = {
  resolutionRequested: "Marked as resolved — waiting for the user to confirm",
  resolutionAccepted: "The user confirmed it's resolved — ticket closed",
  resolutionDeclined: "The user says it's not resolved yet — ticket reopened",
};
