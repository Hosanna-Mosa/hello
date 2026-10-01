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

export const emailLoginSchema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(128),
  timezone: z.string().max(64).optional(),
});

/**
 * Length over composition (NIST 800-63B), plus one letter and one digit so
 * `password` and `12345678` are out. The upper bound caps scrypt's input.
 */
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .max(128, "Use at most 128 characters for your password.")
  .regex(/[A-Za-z]/, "Your password needs at least one letter.")
  .regex(/\d/, "Your password needs at least one number.");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(40),
  email: z.string().trim().min(3).max(254),
  countryCode: z.string().min(1).max(6),
  phoneNumber: z.string().min(1).max(20),
  password: newPassword,
  timezone: z.string().max(64).optional(),
});

/** `identifier` is an email, or a phone number in E.164 (`+919876543210`). */
export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
  timezone: z.string().max(64).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).max(4096),
});

export type SendCodeBody = z.infer<typeof sendCodeSchema>;
export type VerifyCodeBody = z.infer<typeof verifyCodeSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type EmailLoginBody = z.infer<typeof emailLoginSchema>;
export type SignupBody = z.infer<typeof signupSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
