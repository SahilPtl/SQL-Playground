import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import request from "supertest";
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "sql-build-smoke-"));
process.env.NODE_ENV = "test";
const { app } = await import("../server/src/app.js");
const { appDb } = await import("../server/src/database.js");
try {
  const page = await request(app).get("/playground");
  assert.equal(page.status, 200);
  assert.match(page.text, /<title>SQL Playground/);
  const asset = /src="([^"]+\.js)"/.exec(page.text)?.[1];
  assert(asset);
  assert.equal((await request(app).get(asset)).status, 200);
  assert.equal((await request(app).get("/api/health")).body.ok, true);
  console.log(
    "Built frontend, SPA fallback, static JavaScript asset and API health: PASS.",
  );
} finally {
  appDb.close();
  rmSync(process.env.DATA_DIR, { recursive: true, force: true });
}
