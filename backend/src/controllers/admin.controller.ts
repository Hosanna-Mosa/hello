/**
 * Admin panel controllers. HTTP in, service out, serializer back.
 */

import type { Request, Response } from "express";

import { env } from "@/config/env.js";
import { ApiError } from "@/errors/ApiError.js";
import { clearAdminCookie, setAdminCookie } from "@/middlewares/adminAuth.js";
import { toAdmin, toAdminReport, toAdminUser, toAdminUserDetail } from "@/serializers/admin.serializer.js";
import * as adminAuth from "@/services/adminAuth.service.js";
import { listReports, setReportStatus, type Party } from "@/services/adminReports.service.js";
import { dashboardStats } from "@/services/adminStats.service.js";
import {
  deleteUserAsAdmin,
  getUser,
  listUsers,
  revokeUserSessions,
  setUserPremium,
  setUserStatus,
} from "@/services/adminUsers.service.js";
import { announceDeletion, disconnectAdminSession, disconnectUser } from "@/sockets/io.js";
import {
  objectId,
  reportListQuery,
  userListQuery,
  type AdminLoginBody,
  type UserDeleteBody,
  type UserPremiumBody,
  type UserStatusBody,
} from "@/validators/admin.validator.js";

function requireAdminDoc(req: Request) {
  if (!req.admin || !req.adminJti) throw ApiError.unauthorized();
  return { admin: req.admin, jti: req.adminJti };
}

function idParam(req: Request): string {
  const parsed = objectId.safeParse(req.params.id);
  if (!parsed.success) throw ApiError.notFound();
  return parsed.data;
}

const paged = <T>(items: T[], total: number, page: number, limit: number) => ({
  items,
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
});

export async function postLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as AdminLoginBody;
  const { admin, token } = await adminAuth.login(email, password);
  setAdminCookie(res, token, env.ADMIN_SESSION_TTL_SEC);
  res.json(toAdmin(admin));
}

export async function postLogout(req: Request, res: Response): Promise<void> {
  const { jti } = requireAdminDoc(req);
  await adminAuth.logout(jti);
  // A signed-out session's live connection goes with it.
  disconnectAdminSession(jti);
  clearAdminCookie(res);
  res.status(204).end();
}

export async function getSession(req: Request, res: Response): Promise<void> {
  res.json(toAdmin(requireAdminDoc(req).admin));
}

export async function getStats(_req: Request, res: Response): Promise<void> {
  res.json(await dashboardStats());
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  const q = userListQuery.parse(req.query);
  const { items, total } = await listUsers(q);
  res.json(paged(items.map(toAdminUser), total, q.page, q.limit));
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const { user, counts, payments } = await getUser(idParam(req));
  res.json(toAdminUserDetail(user, counts, payments));
}

export async function postRevokeSessions(req: Request, res: Response): Promise<void> {
  const id = idParam(req);
  await revokeUserSessions(id);
  disconnectUser(id);
  res.status(204).end();
}

/** Answers with the full detail, so the panel re-renders from the server's truth. */
async function detail(res: Response, id: string): Promise<void> {
  const { user, counts, payments } = await getUser(id);
  res.json(toAdminUserDetail(user, counts, payments));
}

export async function postUserStatus(req: Request, res: Response): Promise<void> {
  const { admin } = requireAdminDoc(req);
  const id = idParam(req);
  const user = await setUserStatus(admin, id, req.body as UserStatusBody);
  if (user.status === "suspended") disconnectUser(id);
  await detail(res, id);
}

export async function postUserPremium(req: Request, res: Response): Promise<void> {
  const { admin } = requireAdminDoc(req);
  const id = idParam(req);
  await setUserPremium(admin, id, req.body as UserPremiumBody);
  await detail(res, id);
}

export async function postUserDelete(req: Request, res: Response): Promise<void> {
  const { admin } = requireAdminDoc(req);
  const id = idParam(req);
  const { ended } = await deleteUserAsAdmin(admin, id, (req.body as UserDeleteBody).reason);
  announceDeletion(id, ended);
  await detail(res, id);
}

const party = (parties: Map<string, Party>, id: unknown) => parties.get(String(id)) ?? null;

export async function getReports(req: Request, res: Response): Promise<void> {
  const q = reportListQuery.parse(req.query);
  const { items, total, parties } = await listReports(q);
  const rows = items.map((r) => toAdminReport(r, party(parties, r.reporterId), party(parties, r.reportedUserId)));
  res.json(paged(rows, total, q.page, q.limit));
}

export async function patchReport(req: Request, res: Response): Promise<void> {
  const { status } = req.body as { status: "open" | "reviewed" };
  const { report, parties } = await setReportStatus(idParam(req), status);
  res.json(toAdminReport(report, party(parties, report.reporterId), party(parties, report.reportedUserId)));
}
