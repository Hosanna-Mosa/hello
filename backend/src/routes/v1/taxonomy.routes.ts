/**
 * Reference data routes.
 *
 * Unauthenticated on purpose: the onboarding wizard needs the interest and
 * avatar lists BEFORE a profile exists, and none of it is personal data.
 */

import { Router } from "express";

import * as controller from "@/controllers/taxonomy.controller.js";

export const taxonomyRouter: Router = Router();

taxonomyRouter.get("/interests", controller.getInterests);
taxonomyRouter.get("/avatars", controller.getAvatars);
taxonomyRouter.get("/plans", controller.getPlans);
