import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import { config, root } from "./config.js";
import {
  appDb,
  SQLiteSessionStore,
  sessionSecret,
  workspacePath,
} from "./database.js";
import { authRouter, passport, requireAuth } from "./auth.js";
import { execute } from "./executor.js";
import { interviewRouter } from "./interview.js";
import { coachResponse } from "./coach.js";
export const app = express();
if (config.production) {
  if (!config.clientUrl.startsWith("https://"))
    throw new Error("Production requires HTTPS CLIENT_URL.");
  app.set("trust proxy", 1);
}
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'"],
        "upgrade-insecure-requests": config.production ? [] : null,
      },
    },
  }),
);
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: "40kb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  // JSON + Origin checking prevent cross-site mutations; no wildcard CORS.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.get("origin") && req.get("origin") !== config.clientUrl)
      return res.status(403).json({ error: "Request origin is not allowed." });
    if (!req.is("application/json"))
      return res.status(415).json({ error: "Use application/json." });
  }
  next();
});
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, service: "sql-playground" }),
);
app.use(
  session({
    name: "sql.sid",
    secret: sessionSecret(),
    store: new SQLiteSessionStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.production,
      maxAge: 86400000,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 150,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute." },
  }),
);
app.get("/api/schema", async (req, res) =>
  res.json(
    await execute(
      { action: "schema", file: workspacePath(req.user.id) },
      req.user.id,
    ),
  ),
);
app.post("/api/sql/execute", async (req, res) =>
  res.json(
    await execute(
      {
        action: "execute",
        file: workspacePath(req.user.id),
        sql: req.body.sql,
      },
      req.user.id,
    ),
  ),
);
app.post("/api/workspace/reset", async (req, res) => {
  if (req.body.confirm !== "RESET")
    return res
      .status(400)
      .json({ error: "Confirm with RESET to replace your practice database." });
  res.json(
    await execute(
      { action: "reset", file: workspacePath(req.user.id) },
      req.user.id,
    ),
  );
});
app.use("/api/interview", interviewRouter);
app.post(
  "/api/coach",
  rateLimit({
    windowMs: 60000,
    limit: 20,
    message: { error: "Coach limit reached. Wait one minute." },
  }),
  async (req, res) => {
    if (
      appDb
        .prepare(
          "SELECT id FROM interview_attempts WHERE user_id=? AND status IN ('active','grading') AND deadline>?",
        )
        .get(req.user.id, Date.now())
    )
      return res
        .status(403)
        .json({
          error:
            "AI Coach is disabled during an active Interview attempt. Submit the attempt or wait for it to expire.",
        });
    const { action, text } = req.body;
    if (
      !["explain", "hint", "optimize", "generate", "error"].includes(action) ||
      typeof text !== "string" ||
      text.length > 6000
    )
      return res
        .status(400)
        .json({
          error: "Choose a Coach action and enter at most 6000 characters.",
        });
    const schema = await execute(
      { action: "schema", file: workspacePath(req.user.id) },
      req.user.id,
    );
    res.json(await coachResponse(action, text, schema));
  },
);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
app.use(express.static(path.join(root, "dist")));
app.get("/{*path}", (_req, res) =>
  res.sendFile(path.join(root, "dist/index.html")),
);
app.use((error, req, res, _next) => {
  const status =
    error.status || (error.type === "entity.too.large" ? 413 : 500);
  res
    .status(status)
    .json({
      error:
        status < 500
          ? error.message
          : "Server could not complete this request. Check the local server and retry.",
    });
});
