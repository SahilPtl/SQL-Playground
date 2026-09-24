import { Passport } from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { appDb } from "./database.js";
import { config, googleEnabled } from "./config.js";
export const passport = new Passport();
export const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  try {
    done(
      null,
      appDb.prepare("SELECT id,name,email FROM users WHERE id=?").get(id) ||
        false,
    );
  } catch (e) {
    done(e);
  }
});
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = appDb
          .prepare("SELECT * FROM users WHERE email=?")
          .get(email.trim().toLowerCase());
        if (
          !user?.password_hash ||
          !(await bcrypt.compare(password, user.password_hash))
        )
          return done(null, false, { message: "Incorrect email or password." });
        done(null, safeUser(user));
      } catch (e) {
        done(e);
      }
    },
  ),
);
if (googleEnabled)
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleId,
        clientSecret: config.googleSecret,
        callbackURL: config.googleCallback,
        state: true,
      },
      (access, refresh, profile, done) => {
        try {
          let user = appDb
            .prepare("SELECT * FROM users WHERE google_id=?")
            .get(profile.id);
          if (!user) {
            // Never silently link a local account using an unverified email claim.
            const email =
              profile.emails?.find((e) => e.verified)?.value?.toLowerCase() ||
              null;
            if (
              email &&
              appDb.prepare("SELECT id FROM users WHERE email=?").get(email)
            )
              return done(null, false);
            const result = appDb
              .prepare("INSERT INTO users(name,email,google_id) VALUES(?,?,?)")
              .run(profile.displayName || "Learner", email, profile.id);
            user = appDb
              .prepare("SELECT * FROM users WHERE id=?")
              .get(result.lastInsertRowid);
          }
          done(null, safeUser(user));
        } catch {
          done(null, false);
        }
      },
    ),
  );
export const requireAuth = (req, res, next) =>
  req.isAuthenticated()
    ? next()
    : res.status(401).json({ error: "Please log in to continue." });
export const authRouter = Router();
authRouter.get("/me", (req, res) =>
  res.json({
    user: req.user || null,
    googleEnabled,
    demoEnabled: !config.production,
  }),
);
const loginLimit = rateLimit({
  windowMs: 60000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Wait one minute." },
});
function signIn(req, res, next, user) {
  req.logIn(safeUser(user), (error) => {
    if (error) return next(error);
    req.session.save((error) =>
      error ? next(error) : res.json({ user: safeUser(user) }),
    );
  });
}
authRouter.post("/register", loginLimit, async (req, res, next) => {
  const { name, email, password } = req.body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 60 ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length < 10 ||
    Buffer.byteLength(password) > 72
  )
    return res
      .status(400)
      .json({
        error: "Use a name, valid email, and a password of 10–72 bytes.",
      });
  const normalized = email.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 12);
  try {
    const result = appDb
      .prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)")
      .run(name.trim(), normalized, hash);
    signIn(req, res, next, {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: normalized,
    });
  } catch (e) {
    if (e.code?.startsWith("SQLITE_CONSTRAINT"))
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    next(e);
  }
});
authRouter.post("/login", loginLimit, (req, res, next) => {
  if (
    typeof req.body.email !== "string" ||
    typeof req.body.password !== "string" ||
    req.body.password.length > 100
  )
    return res.status(400).json({ error: "Email and password are required." });
  passport.authenticate("local", (error, user) =>
    error
      ? next(error)
      : !user
        ? res.status(401).json({ error: "Incorrect email or password." })
        : signIn(req, res, next, user),
  )(req, res, next);
});
authRouter.post("/logout", requireAuth, (req, res, next) =>
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("sql.sid", { path: "/" }).json({ ok: true });
    });
  }),
);
if (googleEnabled) {
  authRouter.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] }),
  );
  authRouter.get("/google/callback", (req, res, next) => {
    const failure = () =>
      res.redirect(config.clientUrl + "/login?error=google");
    if (req.query.error || !req.query.code || !req.query.state)
      return failure();
    passport.authenticate("google", (error, user) => {
      if (error || !user) return failure();
      req.logIn(user, (error) =>
        error
          ? failure()
          : req.session.save((error) =>
              error
                ? failure()
                : res.redirect(config.clientUrl + "/playground"),
            ),
      );
    })(req, res, next);
  });
}
export async function ensureDemoUser() {
  if (
    config.production ||
    appDb.prepare("SELECT id FROM users WHERE email=?").get("demo@example.test")
  )
    return;
  const hash = await bcrypt.hash("Playground2026!", 12);
  appDb
    .prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)")
    .run("Demo learner", "demo@example.test", hash);
}
