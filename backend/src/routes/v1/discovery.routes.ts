/**
 * Discovery routes.
 *
 * `requireOnboarded` applies here but NOT to `/me`: browsing people needs a
 * finished profile (there is no distance without a location, and no fair
 * exchange in seeing others while showing nothing), whereas `/me` is how a
 * profile gets finished in the first place.
 */

import { Router } from "express";

import * as controller from "@/controllers/discovery.controller.js";
import { requireAuth, requireOnboarded } from "@/middlewares/auth.js";
import { validateBody } from "@/middlewares/validate.js";
import { passSchema } from "@/validators/discovery.validator.js";

export const discoveryRouter: Router = Router();

/**
 * Applied PER ROUTE, not with `router.use()`.
 *
 * This router mounts at `/v1`, so a blanket `use` would run on every unmatched
 * path too — `GET /v1/nope` would answer `unauthorized` instead of falling
 * through to `notFound`, which contradicts the contract's error table and
 * hides real 404s behind a misleading 401.
 */
const guarded = [requireAuth, requireOnboarded];

discoveryRouter.get("/profiles", guarded, controller.getProfiles);
// Before `/profiles/:id`, or "count" and "search" are read as ids.
discoveryRouter.get("/profiles/count", guarded, controller.getProfilesCount);
discoveryRouter.get("/profiles/search", guarded, controller.searchProfiles);
discoveryRouter.get("/profiles/:id", guarded, controller.getProfile);

discoveryRouter.post("/passes", guarded, validateBody(passSchema), controller.postPass);
