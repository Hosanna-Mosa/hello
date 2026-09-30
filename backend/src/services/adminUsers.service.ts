/**
 * User reads and the one user action the panel has: sign out everywhere.
 *
 * Deliberately no "edit profile" — a moderator rewriting a person's bio is a
 * trust problem, not a feature.
 */

import { ApiError } from "@/errors/ApiError.js";
import { BlockModel } from "@/models/block.model.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { ReportModel } from "@/models/report.model.js";
import { SessionModel } from "@/models/session.model.js";
import { UserModel, type UserDoc } from "@/models/user.model.js";
import { revokeAllSessions } from "@/services/token.service.js";
import type { UserListQuery } from "@/validators/admin.validator.js";

/** Escaped: an unescaped user string in a regex is a denial-of-service. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listUsers(q: UserListQuery): Promise<{ items: UserDoc[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;

  if (q.search) {
    const term = q.search.toLowerCase();
    const digits = term.replace(/\D/g, "");
    const or: Record<string, unknown>[] = [{ nameLower: { $regex: escapeRegex(term) } }];
    if (digits.length >= 3) or.push({ "phone.e164": { $regex: digits } });
    filter.$or = or;
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

export async function getUser(id: string): Promise<{ user: UserDoc; counts: Record<string, number> }> {
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
  };
}

export async function revokeUserSessions(id: string): Promise<void> {
  const exists = await UserModel.exists({ _id: id });
  if (!exists) throw ApiError.notFound("User not found.");
  await revokeAllSessions(id, "adminRevoke");
}
