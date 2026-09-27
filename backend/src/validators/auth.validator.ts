/**
 * Auth request shapes.
 *
 * Deliberately permissive about FORMAT and strict about SIZE: the phone
 * normaliser in `utils/phone.ts` owns what a valid number is, so duplicating
 * that rule here would create two places to disagree. What this layer stops is
 * a 10MB string reaching the normaliser.
 */

import { z } from "zod";

export const sendCodeSchema = z.object({
  countryCode: z.string().min(1).max(6),
  phoneNumber: z.string().min(1).max(20),
});

export const verifyCodeSchema = z.object({
  countryCode: z.string().min(1).max(6),
  phoneNumber: z.string().min(1).max(20),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  /** IANA zone from the device. Needed for the quota's local midnight. */
  timezone: z.string().max(64).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).max(4096),
});

export type SendCodeBody = z.infer<typeof sendCodeSchema>;
export type VerifyCodeBody = z.infer<typeof verifyCodeSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
