/**
 * Call routes. Guards per route — a blanket `use()` at `/v1` would turn every
 * unknown path into a 401 instead of a 404.
 */

import { Router } from "express";

import * as controller from "@/controllers/calls.controller.js";
import { requireAuth, requireOnboarded } from "@/middlewares/auth.js";
import { validateBody } from "@/middlewares/validate.js";
import { endCallSchema, startCallSchema } from "@/validators/calls.validator.js";

export const callsRouter: Router = Router();

const guarded = [requireAuth, requireOnboarded];

callsRouter.post("/calls", guarded, validateBody(startCallSchema), controller.postCall);
callsRouter.post("/calls/:id/end", guarded, validateBody(endCallSchema), controller.postEndCall);
callsRouter.get("/calls", guarded, controller.getCalls);
/*
  Before `/calls/:id` patterns, and its own path so it is unmistakable: this
  returns configuration, not a call.
*/
callsRouter.get("/calls/ice", guarded, controller.getIceServers);
