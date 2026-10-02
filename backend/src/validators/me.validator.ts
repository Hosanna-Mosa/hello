/**
 * Profile patch shapes.
 *
 * Every field is optional — this is a PATCH, and the onboarding wizard sends
 * one at a time. `.strict()` rejects unknown keys loudly rather than letting
 * them reach a model that would throw a less helpful error.
 *
 * Note what is NOT patchable: `phone`, `status`, `role`, `entitlements`,
 * `onboardingComplete`, `publicGenderKind`. Anything a user could grant
 * themselves is absent from this schema by design.
 */

import { z } from "zod";

const genderSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("woman") }),
  z.object({ kind: z.literal("man") }),
  z.object({ kind: z.literal("nonBinary") }),
  z.object({ kind: z.literal("selfDescribed"), label: z.string().trim().min(1).max(40) }),
  z.object({ kind: z.literal("preferNotToSay") }),
]);

export const meUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 1998-03-14"),
    gender: genderSchema,
    showGender: z.boolean(),
    avatarId: z.string().min(1).max(40),
    bio: z.string().max(300),
    interestIds: z.array(z.string().min(1).max(60)).max(20),
    timezone: z.string().min(1).max(64),
    location: z.object({
      coordinate: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
      city: z.string().max(80).optional(),
      /**
       * What the device's location API said about the fix. Required: a
       * coordinate typed in by hand has none of this, and the server checks it
       * (me.service `assertGenuineFix`). Not proof — a rooted phone can lie —
       * but it stops every casual spoof.
       */
      fix: z
        .object({
          capturedAt: z.iso.datetime({ offset: true }),
          accuracyMetres: z.number().positive().max(50_000),
          /** Android reports fixes from a "mock location" app. iOS omits it. */
          mocked: z.boolean().optional(),
        })
        .strict(),
    }).strict(),
  })
  .partial()
  .strict();

export const preferencesUpdateSchema = z
  .object({
    discoverable: z.boolean(),
    notificationPrimerShown: z.boolean(),
    notifications: z
      .object({
        newMatches: z.boolean(),
        messages: z.boolean(),
        messageRequests: z.boolean(),
        likes: z.boolean(),
        calls: z.boolean(),
      })
      .partial(),
  })
  .partial()
  .strict();

export const deleteMeSchema = z.object({ reason: z.string().max(200).optional() }).strict();

export type MeUpdateBody = z.infer<typeof meUpdateSchema>;
export type PreferencesUpdateBody = z.infer<typeof preferencesUpdateSchema>;
