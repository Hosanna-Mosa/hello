/**
 * The moderation queue.
 *
 * Party names are looked up in one query per page, not one per row. A party
 * that has since been erased simply is not found, and the serializer falls
 * back to the report's own snapshot — which is why the snapshot exists.
 */

import { ApiError } from "@/errors/ApiError.js";
import { ReportModel, type ReportDoc } from "@/models/report.model.js";
import { UserModel } from "@/models/user.model.js";
import type { ReportListQuery } from "@/validators/admin.validator.js";

export type Party = { id: string; name: string };

export async function listReports(q: ReportListQuery) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.reason) filter.reason = q.reason;

  const [items, total] = await Promise.all([
    ReportModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    ReportModel.countDocuments(filter),
  ]);

  return { items, total, parties: await partiesFor(items) };
}

export async function setReportStatus(id: string, status: "open" | "reviewed") {
  const report = await ReportModel.findById(id);
  if (!report) throw ApiError.notFound("Report not found.");
  report.status = status;
  await report.save();
  return { report, parties: await partiesFor([report]) };
}

async function partiesFor(reports: ReportDoc[]): Promise<Map<string, Party>> {
  const ids = [...new Set(reports.flatMap((r) => [String(r.reporterId), String(r.reportedUserId)]))];
  const users = await UserModel.find({ _id: { $in: ids }, status: { $ne: "erased" } }).select({ name: 1 });
  return new Map(users.map((u) => [String(u._id), { id: String(u._id), name: u.name || "Unnamed" }]));
}
