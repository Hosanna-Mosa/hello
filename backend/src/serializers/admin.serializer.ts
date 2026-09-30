/**
 * What the admin panel sees. Plain JSON, ISO dates, string ids.
 *
 * The phone HMAC and password hashes never leave the server — the panel has
 * no use for either, and a response body is the easiest place to leak one.
 */

import type { AdminDoc } from "@/models/admin.model.js";
import type { ReportDoc } from "@/models/report.model.js";
import type { UserDoc } from "@/models/user.model.js";
import { ageFrom } from "@/utils/age.js";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function toAdmin(a: AdminDoc) {
  return { id: String(a._id), email: a.email, name: a.name, lastLoginAt: iso(a.lastLoginAt) };
}

export function toAdminUser(u: UserDoc) {
  return {
    id: String(u._id),
    name: u.name,
    phone: u.phone?.display ?? null,
    age: u.birthday ? ageFrom(u.birthday) : null,
    gender: u.gender?.kind ?? null,
    city: u.location?.city ?? null,
    status: u.status,
    role: u.role,
    onboardingComplete: u.onboardingComplete,
    isPremium: u.entitlements.isPremium,
    discoverable: u.preferences.discoverable,
    createdAt: iso(u.get("createdAt") as Date | undefined),
    lastActiveAt: iso(u.lastActiveAt),
  };
}

export function toAdminUserDetail(u: UserDoc, counts: Record<string, number>) {
  return {
    ...toAdminUser(u),
    bio: u.bio,
    avatarId: u.avatarId,
    interestIds: u.interestIds,
    timezone: u.timezone,
    deletionRequestedAt: iso(u.deletionRequestedAt),
    purgeAt: iso(u.purgeAt),
    deletionReason: u.deletionReason ?? null,
    counts,
  };
}

type Party = { id: string; name: string } | null;

export function toAdminReport(r: ReportDoc, reporter: Party, reported: Party) {
  return {
    id: String(r._id),
    reason: r.reason,
    details: r.details ?? null,
    status: r.status,
    alsoBlocked: r.alsoBlocked,
    reporter: reporter ?? { id: String(r.reporterId), name: "Deleted account" },
    reported: reported ?? { id: String(r.reportedUserId), name: r.snapshot?.name || "Deleted account" },
    snapshot: {
      name: r.snapshot?.name ?? "",
      bio: r.snapshot?.bio ?? "",
      messages: (r.snapshot?.messages ?? []).map((m) => ({
        senderId: String(m.senderId),
        body: m.body,
        createdAt: iso(m.createdAt),
      })),
    },
    createdAt: iso(r.get("createdAt") as Date | undefined),
  };
}
