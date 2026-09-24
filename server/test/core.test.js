import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import Database from "better-sqlite3";
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "sql-playground-test-"));
process.env.NODE_ENV = "test";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";
process.env.GOOGLE_CALLBACK_URL = "";
process.env.OPENAI_API_KEY = "";
const { app } = await import("../src/app.js");
const { appDb, workspacePath } = await import("../src/database.js");
const { splitSQL, runStatements } = await import("../src/sql.js");
const { challenges, compareResults } = await import("../src/challenges.js");
const { execute } = await import("../src/executor.js");
const { coachResponse } = await import("../src/coach.js");
const userA = request.agent(app),
  userB = request.agent(app);
const post = (agent, url, body) => agent.post(url).send(body);
after(() => {
  appDb.close();
  rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});
test("no-credential startup, authentication and safe session identity", async () => {
  assert.equal((await request(app).get("/api/health")).body.ok, true);
  assert.equal(
    (await request(app).get("/api/auth/me")).body.googleEnabled,
    false,
  );
  assert.equal((await request(app).get("/api/schema")).status, 401);
  const a = await post(userA, "/api/auth/register", {
    name: "Learner A",
    email: "a@example.test",
    password: "Testing2026!",
  });
  assert.equal(a.status, 200);
  assert.equal(a.body.user.id, 1);
  assert.equal(a.body.user.password_hash, undefined);
  assert.match(a.headers["set-cookie"][0], /HttpOnly/);
  assert.match(a.headers["set-cookie"][0], /SameSite=Lax/);
  assert.equal(
    (
      await post(userB, "/api/auth/register", {
        name: "Learner B",
        email: "b@example.test",
        password: "Testing2026!",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await post(userB, "/api/auth/register", {
        name: "Duplicate",
        email: "a@example.test",
        password: "Testing2026!",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await post(request(app), "/api/auth/login", {
        email: "a@example.test",
        password: "bad-password",
      })
    ).status,
    401,
  );
  assert.notEqual(
    appDb.prepare("SELECT password_hash FROM users WHERE id=1").get()
      .password_hash,
    "Testing2026!",
  );
});
test("real DDL/DML, semicolons, result sets and live FK metadata", async () => {
  const sql = `-- comment with ;\nCREATE TABLE notes(id INTEGER PRIMARY KEY, body TEXT, employee_id INTEGER REFERENCES employees(id));\nINSERT INTO notes VALUES(1,'it''s; SQL',1); /* ; ignored */\nUPDATE notes SET body=body || '!' WHERE id=1; SELECT * FROM notes; DELETE FROM notes WHERE id=99;`;
  const { body } = await post(userA, "/api/sql/execute", { sql });
  assert.equal(body.success, true, JSON.stringify(body));
  assert.equal(body.statements.length, 5);
  assert.equal(body.schemaChanged, true);
  assert.equal(body.statements[1].changes, 1);
  assert.equal(body.statements[3].rows[0][1], "it's; SQL!");
  const schema = (await userA.get("/api/schema")).body;
  assert.equal(
    schema.tables.find((t) => t.name === "notes").foreignKeys[0].table,
    "employees",
  );
  assert.equal(
    (
      await post(userA, "/api/sql/execute", {
        sql: "ALTER TABLE notes ADD COLUMN rating INTEGER;",
      })
    ).body.schemaChanged,
    true,
  );
});
test("logout/login persists workspace; two-user isolation ignores forged IDs and paths", async () => {
  await post(userA, "/api/auth/logout", {});
  assert.equal((await userA.get("/api/schema")).status, 401);
  assert.equal(
    (
      await post(userA, "/api/auth/login", {
        email: "a@example.test",
        password: "Testing2026!",
      })
    ).status,
    200,
  );
  assert(
    (await userA.get("/api/schema")).body.tables.some(
      (t) => t.name === "notes",
    ),
  );
  assert(
    !(await userB.get("/api/schema")).body.tables.some(
      (t) => t.name === "notes",
    ),
  );
  const b = await post(userB, "/api/sql/execute", {
    sql: "SELECT * FROM notes",
    userId: 1,
    path: workspacePath(1),
  });
  assert.equal(b.body.success, false);
  assert.match(b.body.error.message, /no such table/);
  assert.throws(() => workspacePath("../app"), /Invalid/);
});
test("partial failure stops sequential execution and locates failing statement", async () => {
  const { body } = await post(userA, "/api/sql/execute", {
    sql: "INSERT INTO notes(body,employee_id) VALUES('kept',1);\nSELECT * FROM missing_table;\nDROP TABLE notes;",
  });
  assert.equal(body.statements.length, 1);
  assert.equal(body.error.statement, 2);
  assert.equal(body.error.line, 2);
  assert.equal(
    (
      await post(userA, "/api/sql/execute", {
        sql: "SELECT count(*) FROM notes",
      })
    ).body.statements[0].rows[0][0],
    2,
  );
});
test("dangerous SQL cannot attach app DB, write files, alter PRAGMAs or load extensions", async () => {
  for (const sql of [
    "ATTACH '../app.db' AS app",
    "VACUUM INTO 'leak.db'",
    "PRAGMA writable_schema=ON",
    "SELECT load_extension('x')",
    "SELECT \"load_extension\"('x')",
    "SELECT * FROM pragma_database_list",
    "CREATE VIRTUAL TABLE bad USING fts5(body)",
    "BEGIN; SELECT 1; COMMIT;",
    "CREATE TRIGGER bad AFTER INSERT ON employees BEGIN DELETE FROM departments; END;",
  ]) {
    const r = await post(userA, "/api/sql/execute", { sql });
    assert.equal(r.body.success, false, sql);
    assert.equal(r.body.statements.length, 0, sql);
  }
  const good = await post(userA, "/api/sql/execute", {
    sql: "PRAGMA table_info('employees');",
  });
  assert.equal(good.body.success, true);
  assert.equal(
    (await post(userA, "/api/sql/execute", { sql: "SELECT * FROM users" })).body
      .success,
    false,
  );
  assert.equal(
    (
      await userA
        .post("/api/sql/execute")
        .set("Origin", "https://evil.example")
        .send({ sql: "SELECT 1" })
    ).status,
    403,
  );
});
test("resource limits: input, rows, statements, timeout and recovery", async () => {
  assert.match(
    (await post(userA, "/api/sql/execute", { sql: "SELECT 1;".repeat(31) }))
      .body.error,
    /30 statements/,
  );
  assert.match(
    (
      await post(userA, "/api/sql/execute", {
        sql: "SELECT " + " ".repeat(33000) + "1",
      })
    ).body.error,
    /32 KB/,
  );
  const limited = (
    await post(userA, "/api/sql/execute", {
      sql: "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000) SELECT x FROM n",
    })
  ).body;
  assert.equal(limited.statements[0].rowCount, 200);
  assert.equal(limited.statements[0].truncated, true);
  const start = Date.now();
  const timeout = (
    await post(userA, "/api/sql/execute", {
      sql: "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n) SELECT sum(x) FROM n",
    })
  ).body;
  assert.match(timeout.error.message, /time limit/);
  assert(Date.now() - start < 7000);
  assert.equal(
    (await post(userA, "/api/sql/execute", { sql: "SELECT 42" })).body.success,
    true,
  );
});
test("all eight reference solutions pass four hidden datasets; constants fail", async () => {
  for (const challenge of challenges) {
    const result = await execute(
      { action: "grade", challengeId: challenge.id, sql: challenge.solution },
      99,
    );
    assert.equal(result.passed, 4, challenge.id);
  }
  const wrong = await execute(
    {
      action: "grade",
      challengeId: "salary-filter",
      sql: "SELECT 2 AS id,'Q' AS name,50001 AS salary",
    },
    99,
  );
  assert.equal(wrong.correct, false);
});
test("workspace storage quota, output byte quota and same-user concurrency", async () => {
  const disk = await execute(
    {
      action: "execute",
      file: workspacePath(1),
      sql: "CREATE TABLE storage_test(x BLOB); INSERT INTO storage_test VALUES(zeroblob(18000000));",
    },
    1,
  );
  assert.equal(disk.success, false);
  assert.equal(disk.error.statement, 2);
  assert.match(disk.error.message, /full/i);
  const output = await execute(
    {
      action: "execute",
      file: workspacePath(1),
      sql: "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<200) SELECT printf('%02000d',x),printf('%02000d',x),printf('%02000d',x) FROM n",
    },
    1,
  );
  assert.equal(output.success, false);
  assert.match(output.error.message, /1 MB/);
  const first = execute(
    {
      action: "execute",
      file: workspacePath(1),
      sql: "WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n) SELECT sum(x) FROM n",
    },
    1,
  );
  await assert.rejects(
    execute({ action: "schema", file: workspacePath(1) }, 1),
    /already running/,
  );
  await first;
  assert.equal(
    (
      await execute(
        { action: "execute", file: workspacePath(1), sql: "SELECT 1" },
        1,
      )
    ).success,
    true,
  );
});
test("comparison respects duplicates, aliases and requested row order", () => {
  const expected = { columns: ["x"], rows: [[1], [2], [2]] };
  assert(
    compareResults({ columns: ["x"], rows: [[2], [1], [2]] }, expected, false),
  );
  assert(
    !compareResults({ columns: ["x"], rows: [[2], [1], [2]] }, expected, true),
  );
  assert(
    !compareResults({ columns: ["x"], rows: [[1], [2]] }, expected, false),
  );
  assert(
    !compareResults(
      { columns: ["wrong"], rows: [[1], [2], [2]] },
      expected,
      false,
    ),
  );
});
test("interview server timing, submission ownership, hidden-data secrecy, score and replay protection", async () => {
  const list = (await userA.get("/api/interview/challenges")).body;
  assert.equal(list.challenges.length, 8);
  assert(!JSON.stringify(list).includes("solution"));
  const { body: start } = await post(
    userA,
    "/api/interview/challenges/salary-filter/start",
    {},
  );
  const id = start.attempt.id;
  assert.equal(start.attempt.deadline - start.attempt.started_at, 600000);
  assert.equal(
    (
      await post(userB, "/api/interview/challenges/salary-filter/submit", {
        attemptId: id,
        sql: challenges[0].solution,
      })
    ).status,
    409,
  );
  assert.equal(
    (await post(userA, "/api/coach", { action: "hint", text: "help" })).status,
    403,
  );
  assert.equal(
    (
      await post(userA, "/api/interview/challenges/salary-filter/run", {
        attemptId: id,
        sql: "DELETE FROM employees",
      })
    ).body.success,
    false,
  );
  assert.equal(
    (
      await post(userA, "/api/interview/challenges/salary-filter/run", {
        attemptId: id,
        sql: "SELECT * FROM employees",
      })
    ).body.statements[0].rowCount,
    8,
  );
  const result = (
    await post(userA, "/api/interview/challenges/salary-filter/submit", {
      attemptId: id,
      sql: challenges[0].solution,
      score: 999,
      elapsed: 0,
    })
  ).body;
  assert.equal(result.passed, 4);
  assert(result.score <= 100 && result.score >= 99);
  assert.equal(result.rows, undefined);
  assert.equal(result.expected, undefined);
  assert.equal(
    (
      await post(userA, "/api/interview/challenges/salary-filter/submit", {
        attemptId: id,
        sql: challenges[0].solution,
      })
    ).status,
    409,
  );
  assert.equal(
    (await userA.get("/api/interview/progress")).body.attempts[0].status,
    "passed",
  );
  const expired = (
    await post(userA, "/api/interview/challenges/salary-filter/start", {})
  ).body.attempt.id;
  appDb
    .prepare("UPDATE interview_attempts SET deadline=? WHERE id=?")
    .run(Date.now() - 1000, expired);
  assert.equal(
    (
      await post(userA, "/api/interview/challenges/salary-filter/submit", {
        attemptId: expired,
        sql: challenges[0].solution,
      })
    ).status,
    409,
  );
});
test("Local Coach works without credentials, limits templates and recovers provider failures", async () => {
  const local = (
    await post(userA, "/api/coach", {
      action: "explain",
      text: "SELECT * FROM employees WHERE salary>50000",
    })
  ).body;
  assert.equal(local.provider, "Local Coach");
  assert.match(local.text, /WHERE/);
  const schema = { tables: [{ name: "employees" }, { name: "departments" }] };
  assert.match(
    (
      await coachResponse(
        "generate",
        "employees with salary above 50000",
        schema,
        { key: "" },
      )
    ).text,
    /salary > 50000/,
  );
  assert.match(
    (await coachResponse("generate", "build a rocket", schema, { key: "" }))
      .text,
    /outside my local templates/,
  );
  for (const status of [401, 429, 500])
    assert.equal(
      (
        await coachResponse("explain", "SELECT 1", schema, {
          key: "deliberately-invalid",
          fetchImpl: async () => ({ ok: false, status }),
        })
      ).provider,
      "Local Coach",
    );
  assert.equal(
    (
      await coachResponse("hint", "help", schema, {
        key: "invalid",
        fetchImpl: async () => {
          throw new Error("network failure");
        },
      })
    ).provider,
    "Local Coach",
  );
  let sent;
  const ai = await coachResponse("explain", "SELECT 1", schema, {
    key: "mock-only",
    fetchImpl: async (url, options) => {
      sent = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                { type: "output_text", text: "Mock provider contract." },
              ],
            },
          ],
        }),
      };
    },
  });
  assert.equal(ai.provider, "AI Coach");
  assert.equal(sent.store, false);
  assert.equal(sent.max_output_tokens, 500);
  assert(!JSON.stringify(sent).includes("hidden"));
});
test("workspace reset requires confirmation and leaves the other workspace alone", async () => {
  assert.equal((await post(userA, "/api/workspace/reset", {})).status, 400);
  await post(userB, "/api/sql/execute", {
    sql: "CREATE TABLE private_b(id INTEGER)",
  });
  const reset = (
    await post(userA, "/api/workspace/reset", { confirm: "RESET" })
  ).body;
  assert.deepEqual(
    reset.tables.map((t) => t.name),
    ["departments", "employees", "projects"],
  );
  assert(
    (await userB.get("/api/schema")).body.tables.some(
      (t) => t.name === "private_b",
    ),
  );
});
test("lexer handles escaped quotes, quoted identifiers, comments and unterminated input", () => {
  assert.equal(
    splitSQL(`SELECT 'a;''b'; SELECT "a;b"; -- ;\n SELECT 3 /* ; */`).length,
    3,
  );
  assert.throws(() => splitSQL("SELECT 'broken"), /Unterminated/);
  const db = new Database(":memory:");
  const result = runStatements(db, "SELECT 1 AS x,2 AS x");
  assert.deepEqual(result.statements[0].rows, [[1, 2]]);
  db.close();
});
