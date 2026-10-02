/**
 * User reads and the panel's user actions: sign out everywhere, suspend /
 * reactivate, grant / revoke premium, and delete.
 *
 * Deliberately no "edit profile" — a moderator rewriting a person's bio is a
 * trust problem, not a feature. Every action is logged with the admin's id.
 */

import { ApiError } from "@/errors/ApiError.js";
import { BlockModel } from "@/models/block.model.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { ReportModel } from "@/models/report.model.js";
import { SessionModel } from "@/models/session.model.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import { logger } from "@/config/logger.js";
import type { AdminDoc } from "@/models/admin.model.js";
import type { PaymentOrderDoc } from "@/models/paymentOrder.model.js";
import { listOrdersForUser } from "@/services/billing.service.js";
import { deleteAccount, type DeletionResult } from "@/services/me.service.js";
import { revokeAllSessions } from "@/services/token.service.js";
import { premiumNowFilter } from "@/utils/entitlements.js";
import type { UserListQuery, UserPremiumBody, UserStatusBody } from "@/validators/admin.validator.js";

/** Escaped: an unescaped user string in a regex is a denial-of-service. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listUsers(q: UserListQuery): Promise<{ items: UserDoc[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.premium === "true") Object.assign(filter, premiumNowFilter());
  if (q.premium === "false") filter["entitlements.isPremium"] = { $ne: true };

  if (q.search) {
    const term = q.search.toLowerCase();
    const digits = term.replace(/\D/g, "");
    const or: Record<string, unknown>[] = [{ nameLower: { $regex: escapeRegex(term) } }];
    if (digits.length >= 3) or.push({ "phone.e164": { $regex: digits } });
    if (term.includes("@") || term.length >= 3) or.push({ "email.address": { $regex: escapeRegex(term) } });
    // `$or` may already hold the premium expiry clause; both must apply.
    if (filter.$or) filter.$and = [{ $or: filter.$or }, { $or: or }];
    else filter.$or = or;
    if (filter.$and) delete filter.$or;
  }

  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    UserModel.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getUser(
  id: string,
): Promise<{ user: UserDoc; counts: Record<string, number>; payments: PaymentOrderDoc[] }> {
  const user = await UserModel.findById(id);
  if (!user) throw ApiError.notFound("User not found.");

  const [matches, likesSent, likesReceived, reportsAgainst, reportsFiled, blocksMade, sessions, messagesSent] =
    await Promise.all([
      MatchModel.countDocuments({ userIds: user._id, endedAt: null }),
      LikeModel.countDocuments({ fromUserId: user._id }),
      LikeModel.countDocuments({ toUserId: user._id }),
      ReportModel.countDocuments({ reportedUserId: user._id }),
      ReportModel.countDocuments({ reporterId: user._id }),
      BlockModel.countDocuments({ blockerId: user._id }),
      SessionModel.countDocuments({ userId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } }),
      MessageModel.countDocuments({ senderId: user._id }),
    ]);

  return {
    user,
    counts: { matches, likesSent, likesReceived, reportsAgainst, reportsFiled, blocksMade, sessions, messagesSent },
    payments: await listOrdersForUser(user._id),
  };
}

export async function revokeUserSessions(id: string): Promise<void> {
  const exists = await UserModel.exists({ _id: id });
  if (!exists) throw ApiError.notFound("User not found.");
  await revokeAllSessions(id, "adminRevoke");
}

async function requireLiveUser(id: string): Promise<UserDoc> {
  const user = await UserModel.findById(id);
  if (!user) throw ApiError.notFound("User not found.");
  if (user.status === "erased") throw ApiError.validation("This account has been deleted.");
  return user;
}

/** Suspend signs the account out everywhere at once; reactivate lets it sign in again. */
export async function setUserStatus(admin: AdminDoc, id: string, body: UserStatusBody): Promise<UserDoc> {
  const user = await requireLiveUser(id);
  if (user.status === "pendingDeletion") throw ApiError.validation("This account is being deleted.");

  if (body.status === "suspended") {
    user.status = "suspended";
    user.suspendedAt = new Date();
    user.suspendedReason = body.reason ?? null;
    await user.save();
    await revokeAllSessions(id, "adminRevoke");
  } else {
    user.status = "active";
    user.suspendedAt = null;
    user.suspendedReason = null;
    await user.save();
  }
  logger.info({ adminId: String(admin._id), userId: id, status: body.status }, "[admin] user status changed");
  return user;
}

/** A manual grant (testers, support, refunds) or a revoke. Recorded as `source: "admin"`. */
export async function setUserPremium(admin: AdminDoc, id: string, body: UserPremiumBody): Promise<UserDoc> {
  const user = await requireLiveUser(id);
  const now = new Date();

  if (body.isPremium) {
    user.entitlements.isPremium = true;
    user.entitlements.since = user.entitlements.since ?? now;
    user.entitlements.expiresAt = body.days ? new Date(now.getTime() + body.days * 86_400_000) : null;
    user.entitlements.source = "admin";
  } else {
    user.entitlements.isPremium = false;
    user.entitlements.since = null;
    user.entitlements.expiresAt = null;
    user.entitlements.source = null;
  }
  await user.save();
  logger.info(
    { adminId: String(admin._id), userId: id, isPremium: body.isPremium, days: body.days ?? null },
    "[admin] premium changed",
  );
  return user;
}

/** The user's own instant delete + archive, recorded as done by an admin. */
export async function deleteUserAsAdmin(admin: AdminDoc, id: string, reason?: string): Promise<DeletionResult> {
  const user = await requireLiveUser(id);
  const result = await deleteAccount(user, reason ?? "Deleted by an administrator", "admin");
  logger.info({ adminId: String(admin._id), userId: id }, "[admin] user deleted");
  return result;
}
