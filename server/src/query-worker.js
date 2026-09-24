import Database from "better-sqlite3";
import { existsSync, rmSync } from "node:fs";
import { seedDatabase } from "./seeds.js";
import { getSchema, runStatements } from "./sql.js";
import { challenges, compareResults } from "./challenges.js";
function openDatabase(file = ":memory:") {
  const fresh = file === ":memory:" || !existsSync(file);
  const db = new Database(file, { timeout: 500 });
  db.pragma("foreign_keys=ON");
  db.pragma("max_page_count=4096");
  db.pragma("temp_store=MEMORY");
  // No extensions or custom filesystem functions are registered.
  db.defaultSafeIntegers(true);
  if (fresh) db.transaction(() => seedDatabase(db))();
  return db;
}
process.once("message", (task) => {
  let db;
  try {
    if (task.action === "grade") {
      const c = challenges.find((c) => c.id === task.challengeId);
      if (!c) throw new Error("Challenge not found.");
      let passed = 0;
      for (let variant = 1; variant <= 4; variant++) {
        db = new Database(":memory:");
        seedDatabase(db, variant);
        db.pragma("query_only=ON");
        try {
          const actual = runStatements(db, task.sql, { readOnly: true });
          const expected = runStatements(db, c.solution, { readOnly: true });
          if (
            actual.success &&
            compareResults(
              actual.statements[0],
              expected.statements[0],
              c.ordered,
            )
          )
            passed++;
        } catch {
          /* Hidden dataset errors never leave this process. */
        }
        db.close();
        db = null;
      }
      process.send({
        type: "result",
        data: { passed, total: 4, correct: passed === 4 },
      });
    } else {
      if (task.action === "reset")
        for (const suffix of ["", "-wal", "-shm", "-journal"])
          rmSync(task.file + suffix, { force: true });
      db = openDatabase(task.file);
      if (task.action === "schema" || task.action === "reset")
        process.send({ type: "result", data: getSchema(db) });
      else {
        if (task.readOnly) db.pragma("query_only=ON");
        const result = runStatements(db, task.sql, {
          readOnly: task.readOnly,
          onStatement: (data) => process.send({ type: "statement", data }),
        });
        process.send({ type: "result", data: result });
      }
    }
  } catch (e) {
    process.send({
      type: "error",
      message:
        task.action === "grade"
          ? "Submission could not be evaluated."
          : e.message,
    });
  } finally {
    db?.close();
    process.disconnect();
  }
});
