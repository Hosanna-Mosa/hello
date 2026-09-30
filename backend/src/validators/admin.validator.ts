/**
 * Admin request shapes. Query strings are parsed here too — nothing a panel
 * sends reaches a Mongo filter unparsed (see `config/mongo.ts`).
 */

import { Types } from "mongoose";
import { z } from "zod";

import { REPORT_REASONS } from "@/models/report.model.js";

export const adminLoginSchema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
});

const page = z.coerce.number().int().min(1).max(10_000).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(20);

export const userListQuery = z.object({
  page,
  limit,
  search: z.string().trim().max(60).optional(),
  status: z.enum(["active", "pendingDeletion", "erased"]).optional(),
});

export const reportListQuery = z.object({
  page,
  limit,
  status: z.enum(["open", "reviewed"]).optional(),
  reason: z.enum(REPORT_REASONS).optional(),
});

export const reportUpdateSchema = z.object({ status: z.enum(["open", "reviewed"]) }).strict();

export const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid id");

export type AdminLoginBody = z.infer<typeof adminLoginSchema>;
export type UserListQuery = z.infer<typeof userListQuery>;
export type ReportListQuery = z.infer<typeof reportListQuery>;
