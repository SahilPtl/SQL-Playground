import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "sql-google-test-"));
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:15174";
process.env.SESSION_COOKIE_NAME = "sql.google-test.sid";
process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-only-secret";
process.env.GOOGLE_CALLBACK_URL =
  "http://localhost:15001/api/auth/google/callback";
process.env.OPENAI_API_KEY = "";
process.env.GEMINI_API_KEY = "";
const { app } = await import("../src/app.js");
const { appDb } = await import("../src/database.js");
const { passport } = await import("../src/auth.js");
const strategy = passport._strategy("google");
let exchangeCalls = 0;
let providerFails = false;
let profile = {
  sub: "google-learner-1",
  name: "Google learner",
  email: "google@example.test",
  email_verified: true,
};
// Replace only Google's network transport; real Passport state, profile parsing,
// account lookup, session persistence, cookies and routes still execute.
strategy._oauth2.getOAuthAccessToken = (_code, _params, done) => {
  exchangeCalls++;
  if (providerFails) return done(new Error("synthetic provider failure"));
  done(null, "test-access-token", "test-refresh-token", {});
};
strategy._oauth2.get = (_url, _token, done) =>
  done(null, JSON.stringify(profile));
after(() => {
  appDb.close();
  rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});
async function begin(agent) {
  const response = await agent.get("/api/auth/google");
  assert.equal(response.status, 302);
  const url = new URL(response.headers.location);
  assert.equal(url.hostname, "accounts.google.com");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    process.env.GOOGLE_CALLBACK_URL,
  );
  assert.equal(url.searchParams.get("scope"), "profile email");
  assert.ok(url.searchParams.get("state"));
  assert.ok(
    !response.headers.location.includes(process.env.GOOGLE_CLIENT_SECRET),
  );
  return url.searchParams.get("state");
}
const finish = (agent, state) =>
  agent.get("/api/auth/google/callback").query({ code: "test-code", state });

test("Google callback creates a safe session, persists workspace and reuses the same account", async () => {
  const agent = request.agent(app);
  const result = await finish(agent, await begin(agent));
  assert.equal(result.headers.location, "http://localhost:15174/playground");
  assert.match(
    result.headers["set-cookie"].join(";"),
    /sql\.google-test\.sid=.*HttpOnly/,
  );
  const user = (await agent.get("/api/auth/me")).body.user;
  assert.deepEqual(Object.keys(user).sort(), ["email", "id", "name"]);
  assert.equal(user.email, "google@example.test");
  assert.equal(
    (
      await agent.post("/api/sql/execute").send({
        sql: "CREATE TABLE google_notes(body TEXT); INSERT INTO google_notes VALUES ('kept');",
      })
    ).body.success,
    true,
  );
  const logout = await agent.post("/api/auth/logout").send({});
  assert.match(
    logout.headers["set-cookie"].join(";"),
    /sql\.google-test\.sid=;/,
  );
  assert.equal((await agent.get("/api/auth/me")).body.user, null);
  await finish(agent, await begin(agent));
  assert.equal((await agent.get("/api/auth/me")).body.user.id, user.id);
  assert.equal(
    appDb
      .prepare("SELECT COUNT(*) AS n FROM users WHERE google_id=?")
      .get(profile.sub).n,
    1,
  );
  assert.equal(
    (
      await agent
        .post("/api/sql/execute")
        .send({ sql: "SELECT * FROM google_notes" })
    ).body.success,
    true,
  );
  assert.ok(
    !JSON.stringify(appDb.prepare("SELECT data FROM sessions").all()).includes(
      "test-access-token",
    ),
  );
});

test("Google cannot silently take over a local account with the same verified email", async () => {
  const local = request.agent(app);
  await local.post("/api/auth/register").send({
    name: "Local learner",
    email: "existing@example.test",
    password: "Testing2026!",
  });
  const google = request.agent(app);
  profile = {
    ...profile,
    sub: "google-collision",
    email: "existing@example.test",
  };
  const result = await finish(google, await begin(google));
  assert.equal(
    result.headers.location,
    "http://localhost:15174/login?error=google_account",
  );
  assert.equal((await google.get("/api/auth/me")).body.user, null);
  assert.equal(
    appDb
      .prepare("SELECT google_id FROM users WHERE email=?")
      .get(profile.email).google_id,
    null,
  );
  assert.equal(
    (
      await local
        .post("/api/sql/execute")
        .send({ sql: "SELECT * FROM google_notes" })
    ).body.success,
    false,
  );
});

test("missing, cross-session, mismatched and replayed OAuth state cannot log in", async () => {
  const a = request.agent(app),
    b = request.agent(app);
  const before = exchangeCalls;
  const state = await begin(a);
  assert.equal(
    (await finish(b, state)).headers.location,
    "http://localhost:15174/login?error=google",
  );
  assert.equal(
    (await finish(a, "wrong-state")).headers.location,
    "http://localhost:15174/login?error=google",
  );
  assert.equal(
    (await finish(a, state)).headers.location,
    "http://localhost:15174/login?error=google",
  );
  assert.equal(
    (await a.get("/api/auth/google/callback?code=test-code")).headers.location,
    "http://localhost:15174/login?error=google_state",
  );
  assert.equal(exchangeCalls, before);
  assert.equal((await a.get("/api/auth/me")).body.user, null);
  profile = { ...profile, sub: "google-replay", email: "replay@example.test" };
  const valid = await begin(a);
  assert.equal(
    (await finish(a, valid)).headers.location,
    "http://localhost:15174/playground",
  );
  const afterSuccess = exchangeCalls;
  await a.post("/api/auth/logout").send({});
  assert.equal(
    (await finish(a, valid)).headers.location,
    "http://localhost:15174/login?error=google",
  );
  assert.equal(exchangeCalls, afterSuccess);
  assert.equal((await a.get("/api/auth/me")).body.user, null);
});

test("Google denial and token failures return safe errors while local login remains available", async () => {
  const agent = request.agent(app);
  assert.equal(
    (await agent.get("/api/auth/google/callback?error=access_denied")).headers
      .location,
    "http://localhost:15174/login?error=google_denied",
  );
  providerFails = true;
  try {
    const response = await finish(agent, await begin(agent));
    assert.equal(
      response.headers.location,
      "http://localhost:15174/login?error=google",
    );
    assert.ok(!response.text.includes("synthetic provider failure"));
    assert.equal((await agent.get("/api/auth/me")).body.user, null);
  } finally {
    providerFails = false;
  }
  assert.equal(
    (
      await agent
        .post("/api/auth/login")
        .send({ email: "existing@example.test", password: "Testing2026!" })
    ).status,
    200,
  );
});
