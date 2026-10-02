/**
 * Discovery query shapes.
 *
 * Query strings are always strings, so everything coerces. `interestIds` and
 * `genders` accept either a repeated param or a comma-separated list, because
 * both are in the wild and rejecting one is a confusing 400.
 *
 * `minAge` is NOT clamped here — the service floors it at 18 regardless, and
 * clamping in two places invites them to disagree.
 */

import { z } from "zod";

const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const parts = Array.isArray(v) ? v : v.split(",");
    const cleaned = parts.map((s) => s.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  });

export const discoveryQuerySchema = z.object({
  /**
   * Snapped UP to whole kilometres. The app only ever sends whole km; a 1 m
   * step would let a caller binary-search someone's exact distance by watching
   * them enter and leave the results, undoing the rounding on `distanceMetres`.
   */
  maxDistanceMetres: z.coerce
    .number()
    .int()
    .positive()
    .max(100_000)
    .optional()
    .transform((v) => (v === undefined ? undefined : Math.min(Math.ceil(v / 1000) * 1000, 100_000))),
  minAge: z.coerce.number().int().min(18).max(120).optional(),
  maxAge: z.coerce.number().int().min(18).max(120).optional(),
  interestIds: list,
  genders: list,
  activeRecently: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  cursor: z.string().max(512).optional(),
});

export const searchQuerySchema = z.object({ q: z.string().trim().max(60).optional() });

export const passSchema = z.object({ targetId: z.string().min(1).max(64) }).strict();

export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;
