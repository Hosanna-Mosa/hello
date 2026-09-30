/**
 * The dashboard numbers. Every figure is a live count against the database —
 * nothing is cached, because a moderation dashboard that lags is one that
 * gets second-guessed.
 */

import { BlockModel } from "@/models/block.model.js";
import { CallModel } from "@/models/call.model.js";
import { LikeModel } from "@/models/like.model.js";
import { MatchModel } from "@/models/match.model.js";
import { MessageModel } from "@/models/message.model.js";
import { ReportModel } from "@/models/report.model.js";
import { UserModel } from "@/models/user.model.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const SIGNUP_DAYS = 14;

export async function dashboardStats() {
  const now = Date.now();
  const since = (days: number) => new Date(now - days * DAY_MS);

  const [
    usersTotal, usersActive, usersPending, usersErased, onboarded, premium,
    new7d, active24h, active7d, matchesTotal, matchesLive, messages, likes,
    callsTotal, callsCompleted, reportsOpen, reportsTotal, blocks, signups,
  ] = await Promise.all([
    UserModel.countDocuments({}),
    UserModel.countDocuments({ status: "active" }),
    UserModel.countDocuments({ status: "pendingDeletion" }),
    UserModel.countDocuments({ status: "erased" }),
    UserModel.countDocuments({ status: "active", onboardingComplete: true }),
    UserModel.countDocuments({ status: "active", "entitlements.isPremium": true }),
    UserModel.countDocuments({ createdAt: { $gte: since(7) } }),
    UserModel.countDocuments({ status: "active", lastActiveAt: { $gte: since(1) } }),
    UserModel.countDocuments({ status: "active", lastActiveAt: { $gte: since(7) } }),
    MatchModel.countDocuments({}),
    MatchModel.countDocuments({ endedAt: null }),
    MessageModel.estimatedDocumentCount(),
    LikeModel.estimatedDocumentCount(),
    CallModel.countDocuments({}),
    CallModel.countDocuments({ outcome: "completed" }),
    ReportModel.countDocuments({ status: "open" }),
    ReportModel.countDocuments({}),
    BlockModel.estimatedDocumentCount(),
    signupsByDay(since(SIGNUP_DAYS - 1)),
  ]);

  return {
    users: {
      total: usersTotal, active: usersActive, pendingDeletion: usersPending, erased: usersErased,
      onboarded, premium, new7d, active24h, active7d,
    },
    matches: { total: matchesTotal, live: matchesLive },
    messages,
    likes,
    calls: { total: callsTotal, completed: callsCompleted },
    reports: { open: reportsOpen, total: reportsTotal },
    blocks,
    signups,
  };
}

/** One entry per day, oldest first, zero-filled so a chart has no gaps. */
async function signupsByDay(from: Date): Promise<{ date: string; count: number }[]> {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const rows = await UserModel.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r.count]));

  return Array.from({ length: SIGNUP_DAYS }, (_, i) => {
    const date = new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { date, count: byDay.get(date) ?? 0 };
  });
}
