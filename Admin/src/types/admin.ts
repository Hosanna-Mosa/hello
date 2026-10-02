/** Response shapes of `/v1/admin` — mirrors backend/src/serializers/admin.serializer.ts. */

export type Admin = { id: string; email: string; name: string; lastLoginAt: string | null };

export type UserStatus = "active" | "suspended" | "pendingDeletion" | "erased";
export type ReportStatus = "open" | "reviewed";

export type AdminUser = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  status: UserStatus;
  role: string;
  onboardingComplete: boolean;
  isPremium: boolean;
  /** When the current premium ends; null when free or open-ended. */
  premiumUntil: string | null;
  discoverable: boolean;
  createdAt: string | null;
  lastActiveAt: string | null;
};

export type AdminPayment = {
  id: string;
  planLabel: string;
  amountMinor: number;
  currency: string;
  status: "created" | "paid" | "expired" | "cancelled" | "failed";
  providerPaymentId: string | null;
  confirmedVia: "webhook" | "poll" | null;
  grantedUntil: string | null;
  paidAt: string | null;
  createdAt: string | null;
};

export type AdminUserDetail = AdminUser & {
  phoneE164: string | null;
  birthday: string | null;
  genderLabel: string | null;
  showGender: boolean;
  location: {
    latitude: number;
    longitude: number;
    city: string | null;
    accuracyMetres: number | null;
    updatedAt: string | null;
  } | null;
  notifications: Record<string, boolean>;
  premium: { active: boolean; flag: boolean; since: string | null; expiresAt: string | null; source: string | null };
  suspendedAt: string | null;
  suspendedReason: string | null;
  payments: AdminPayment[];
  bio: string;
  avatarId: string;
  interestIds: string[];
  timezone: string;
  deletionRequestedAt: string | null;
  purgeAt: string | null;
  deletionReason: string | null;
  counts: Record<string, number>;
};

export type AdminReport = {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  alsoBlocked: boolean;
  reporter: { id: string; name: string };
  reported: { id: string; name: string };
  snapshot: { name: string; bio: string; messages: { senderId: string; body: string; createdAt: string | null }[] };
  createdAt: string | null;
};

export type Paged<T> = { items: T[]; total: number; page: number; limit: number; pages: number };

export type DashboardStats = {
  users: {
    total: number;
    active: number;
    suspended: number;
    pendingDeletion: number;
    erased: number;
    onboarded: number;
    premium: number;
    new7d: number;
    active24h: number;
    active7d: number;
  };
  matches: { total: number; live: number };
  messages: number;
  likes: number;
  calls: { total: number; completed: number };
  reports: { open: number; total: number };
  blocks: number;
  signups: { date: string; count: number }[];
};

// --- Support — mirrors backend/src/serializers/support.serializer.ts (admin view)

export type SupportTicketStatus = "open" | "pendingResolution" | "resolved";
export type SupportCategory = "account" | "safety" | "technical" | "billing" | "feedback" | "other";
export type SupportAuthor = "user" | "admin" | "system";
export type SupportEvent = "resolutionRequested" | "resolutionAccepted" | "resolutionDeclined";

export type AdminSupportTicket = {
  id: string;
  subject: string;
  category: SupportCategory;
  status: SupportTicketStatus;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageAuthor: SupportAuthor;
  /** Replies from the user the team has not opened yet. */
  unreadCount: number;
  resolutionRequestedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; avatarId: string; status: string };
};

export type AdminSupportMessage = {
  id: string;
  ticketId: string;
  author: SupportAuthor;
  body: string;
  event: SupportEvent | null;
  clientMessageId: string | null;
  createdAt: string;
  /** Which operator wrote an `admin` message. */
  adminId: string | null;
};

export type AdminSupportDetail = { ticket: AdminSupportTicket; messages: AdminSupportMessage[] };

export type SupportSummary = { open: number; pendingResolution: number; resolved: number; unread: number };

export const REPORT_REASONS = [
  "romanticAdvance",
  "harassment",
  "inappropriateContent",
  "spamOrScam",
  "fakeProfile",
  "underage",
  "other",
] as const;
