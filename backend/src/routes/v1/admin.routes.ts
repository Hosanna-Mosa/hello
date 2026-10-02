/**
 * The admin panel's API, mounted at `/v1/admin` in `app.ts` — BEFORE the
 * app's permissive CORS, with its own (see there).
 *
 * `adminGuard` covers every route, the login included. Everything except the
 * login additionally requires a live admin session; there is no admin route
 * reachable without one.
 */

import { Router } from "express";

import * as controller from "@/controllers/admin.controller.js";
import * as supportController from "@/controllers/adminSupport.controller.js";
import { adminGuard, requireAdmin } from "@/middlewares/adminAuth.js";
import { rateLimit } from "@/middlewares/rateLimit.js";
import { validateBody } from "@/middlewares/validate.js";
import {
  adminLoginSchema,
  reportUpdateSchema,
  userDeleteSchema,
  userPremiumSchema,
  userStatusSchema,
} from "@/validators/admin.validator.js";
import { supportMessageSchema } from "@/validators/support.validator.js";

export const adminRouter: Router = Router();

adminRouter.use(adminGuard);

adminRouter.post("/auth/login", rateLimit("admin-login-ip", "ip"), validateBody(adminLoginSchema), controller.postLogin);

// Everything below this line is authenticated.
adminRouter.use(requireAdmin, rateLimit("admin-api", "user"));

adminRouter.get("/auth/session", controller.getSession);
adminRouter.post("/auth/logout", controller.postLogout);
adminRouter.get("/auth/socket-ticket", supportController.getSocketTicket);

adminRouter.get("/stats", controller.getStats);

adminRouter.get("/users", controller.getUsers);
adminRouter.get("/users/:id", controller.getUserById);
adminRouter.post("/users/:id/revoke-sessions", controller.postRevokeSessions);
adminRouter.post("/users/:id/status", validateBody(userStatusSchema), controller.postUserStatus);
adminRouter.post("/users/:id/premium", validateBody(userPremiumSchema), controller.postUserPremium);
adminRouter.post("/users/:id/delete", validateBody(userDeleteSchema), controller.postUserDelete);

adminRouter.get("/reports", controller.getReports);
adminRouter.patch("/reports/:id", validateBody(reportUpdateSchema), controller.patchReport);

adminRouter.get("/support/summary", supportController.getSummary);
adminRouter.get("/support/tickets", supportController.getTickets);
adminRouter.get("/support/tickets/:id", supportController.getTicket);
adminRouter.post("/support/tickets/:id/messages", validateBody(supportMessageSchema), supportController.postMessage);
adminRouter.post("/support/tickets/:id/resolve", supportController.postResolve);
adminRouter.post("/support/tickets/:id/read", supportController.postRead);
