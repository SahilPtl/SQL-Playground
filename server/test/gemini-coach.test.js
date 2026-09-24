import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "sql-gemini-test-"));
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.SESSION_COOKIE_NAME = "sql.sid";
process.env.GOOGLE_CLIENT_ID = "";
process.env.GOOGLE_CLIENT_SECRET = "";
process.env.GOOGLE_CALLBACK_URL = "";
process.env.OPENAI_API_KEY = "";
process.env.GEMINI_API_KEY = "mock-gemini-key";
process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
const { coachResponse } = await import("../src/coach.js");
const { app } = await import("../src/app.js");
const { appDb } = await import("../src/database.js");
after(() => {
  appDb.close();
  rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});
const schema = { tables: [{ name: "employees" }] };
const success = (text = "SELECT name FROM employees;") => ({
  candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }],
});
const response = (body) => ({ ok: true, json: async () => body });

test("Gemini receives only the prompt/schema and uses a header key; it takes precedence over OpenAI", async () => {
  let calls = 0;
  const result = await coachResponse(
    "generate",
    "List employee names",
    schema,
    {
      key: "mock-openai-key",
      geminiKey: "mock-gemini-key",
      fetchImpl: async (url, options) => {
        calls++;
        assert.equal(
          url,
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        );
        assert.equal(options.headers["x-goog-api-key"], "mock-gemini-key");
        assert.equal(options.headers.Authorization, undefined);
        assert(options.signal instanceof AbortSignal);
        const body = JSON.parse(options.body);
        assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), {
          action: "generate",
          text: "List employee names",
          schema,
        });
        assert.equal(body.generationConfig.maxOutputTokens, 2048);
        assert.match(body.systemInstruction.parts[0].text, /never execute/i);
        assert(!options.body.includes("mock-gemini-key"));
        return response({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  { thought: true, text: "private thought" },
                  { text: "SELECT name " },
                  { text: "FROM employees;" },
                ],
              },
            },
          ],
        });
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.provider, "Gemini Coach");
  assert.equal(result.text, "SELECT name \nFROM employees;");
  assert(!JSON.stringify(result).includes("private thought"));
});

test("Gemini HTTP failures stay local without forwarding to OpenAI or exposing provider errors", async () => {
  for (const status of [400, 401, 403, 404, 429, 500, 503]) {
    let calls = 0;
    const result = await coachResponse("explain", "SELECT 1", schema, {
      key: "mock-openai-key",
      fetchImpl: async () => {
        calls++;
        return {
          ok: false,
          status,
          json: async () => {
            throw new Error("Must not expose upstream error text");
          },
        };
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.provider, "Local Coach");
    if (status === 429) assert.match(result.reason, /quota or rate limit/);
    assert(!JSON.stringify(result).includes("mock-"));
  }
});

test("Blocked, empty, malformed and failed Gemini responses recover to local guidance", async () => {
  for (const body of [
    null,
    {},
    { promptFeedback: { blockReason: "SAFETY" } },
    {
      candidates: [
        { finishReason: "SAFETY", content: { parts: [{ text: "discard" }] } },
      ],
    },
    success("  "),
    {
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ thought: true, text: "discard" }] },
        },
      ],
    },
  ]) {
    const result = await coachResponse("explain", "SELECT 1", schema, {
      fetchImpl: async () => response(body),
    });
    assert.equal(result.provider, "Local Coach");
    assert(!result.text.includes("discard"));
  }
  for (const error of [
    new Error("private network details"),
    new DOMException("private timeout details", "TimeoutError"),
    new SyntaxError("private JSON details"),
  ]) {
    const result = await coachResponse("explain", "SELECT 1", schema, {
      fetchImpl: async () => {
        throw error;
      },
    });
    assert.equal(result.provider, "Local Coach");
    assert.match(result.reason, /failed or timed out/);
    assert(!JSON.stringify(result).includes("private"));
  }
});

test("Shortened Gemini answers are bounded and visibly flagged", async () => {
  for (const body of [
    success("x".repeat(8100)),
    {
      candidates: [
        {
          finishReason: "MAX_TOKENS",
          content: { parts: [{ text: "SELECT" }] },
        },
      ],
    },
  ]) {
    const result = await coachResponse("generate", "List employees", schema, {
      fetchImpl: async () => response(body),
    });
    assert.equal(result.provider, "Gemini Coach");
    assert(result.text.length <= 8000);
    assert.match(result.reason, /incomplete SQL/);
  }
});

test("No credentials stays offline even when a developer has a local Gemini .env", async () => {
  const result = await coachResponse("explain", "SELECT 1", schema, {
    key: "",
    geminiKey: "",
    fetchImpl: async () => {
      assert.fail("Must stay offline");
    },
  });
  assert.equal(result.provider, "Local Coach");
});

test("Authenticated Coach route uses the learner's schema, excludes rows and remains disabled in Interview", async () => {
  const agent = request.agent(app);
  assert.equal(
    (
      await agent.post("/api/auth/register").send({
        name: "Gemini learner",
        email: "gemini@example.test",
        password: "Testing2026!",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await agent.post("/api/sql/execute").send({
        sql: "CREATE TABLE coach_test(marker TEXT); INSERT INTO coach_test VALUES ('row-must-stay-local');",
      })
    ).body.success,
    true,
  );
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.match(url, /^https:\/\/generativelanguage\.googleapis\.com\//);
    assert(options.body.includes("coach_test"));
    assert(!options.body.includes("row-must-stay-local"));
    assert(!options.body.includes("gemini@example.test"));
    return response(success());
  };
  try {
    assert.equal(
      (
        await request(app)
          .post("/api/coach")
          .send({ action: "hint", text: "help" })
      ).status,
      401,
    );
    const answer = await agent
      .post("/api/coach")
      .send({ action: "generate", text: "List employee names" });
    assert.equal(answer.body.provider, "Gemini Coach");
    assert(!JSON.stringify(answer.body).includes("mock-gemini-key"));
    assert.equal(
      (
        await agent
          .post("/api/interview/challenges/salary-filter/start")
          .send({})
      ).status,
      201,
    );
    assert.equal(
      (await agent.post("/api/coach").send({ action: "hint", text: "help" }))
        .status,
      403,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = realFetch;
  }
});
