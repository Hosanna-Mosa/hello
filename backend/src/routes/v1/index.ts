/**
 * The /v1 surface. One line per feature area, mounted in `app.ts`.
 */

import { Router } from "express";

import { authRouter } from "@/routes/v1/auth.routes.js";
import { callsRouter } from "@/routes/v1/calls.routes.js";
import { discoveryRouter } from "@/routes/v1/discovery.routes.js";
import { likesRouter } from "@/routes/v1/likes.routes.js";
import { meRouter } from "@/routes/v1/me.routes.js";
import { safetyRouter } from "@/routes/v1/safety.routes.js";
import { supportRouter } from "@/routes/v1/support.routes.js";
import { threadsRouter } from "@/routes/v1/threads.routes.js";
import { taxonomyRouter } from "@/routes/v1/taxonomy.routes.js";

export const v1Router: Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/me", meRouter);
v1Router.use("/", discoveryRouter);
v1Router.use("/", likesRouter);
v1Router.use("/", threadsRouter);
v1Router.use("/", callsRouter);
v1Router.use("/", safetyRouter);
v1Router.use("/", supportRouter);
v1Router.use("/", taxonomyRouter);
