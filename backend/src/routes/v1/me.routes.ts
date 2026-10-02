/**
 * Profile routes.
 *
 * Note there is no `requireOnboarded` here. A half-onboarded user must be able
 * to read and patch their own profile — that is how they finish onboarding.
 *
 * There is deliberately no `POST /me/restore` route. Deleting revokes every
 * session, so no valid token can exist to call it — an endpoint nobody can
 * reach is worse than no endpoint, because it reads as a working feature.
 * Restoring happens by signing in again, which `auth.service.verifyCode`
 * handles inside the grace period.
 */

import { Router } from "express";

import * as controller from "@/controllers/me.controller.js";
import { requireAuth } from "@/middlewares/auth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import { deleteMeSchema, meUpdateSchema, preferencesUpdateSchema } from "@/validators/me.validator.js";

export const meRouter: Router = Router();

meRouter.use(requireAuth, rateLimit("api-user", "user"));

meRouter.get("/", controller.getMe);
meRouter.patch("/", rateLimit("me-write", "user"), validateBody(meUpdateSchema), controller.patchMe);
meRouter.delete("/", validateBody(deleteMeSchema), controller.deleteMe);

meRouter.get("/preferences", controller.getPreferences);
meRouter.get("/entitlements", controller.getEntitlements);
meRouter.patch("/preferences", rateLimit("me-write", "user"), validateBody(preferencesUpdateSchema), controller.patchPreferences);
