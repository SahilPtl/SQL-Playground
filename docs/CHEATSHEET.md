# SQL Playground - quick interview review

**Interview: 26 September 2026, Asia/Kolkata. Rebuild: 25 September 2026.**

## Open and run (this Windows laptop)

```powershell
code "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground"
cd "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground"
npm run setup
npm run demo
```

Setup is one-time; it clean-installs the lockfile using Node 24. It needs internet. Thereafter the core demo works offline. System Node 20 on this laptop is handled by `scripts/runtime.js`, which finds the installed Codex Node 24. Other machines should install Node 24 LTS.

**UI:** http://localhost:15173 · **API:** http://localhost:15000/api/health

**Demo:** `demo@example.test` / `Playground2026!` (development only)

**Stop:** `npm run stop` or Ctrl+C. **Reset own data:** Reset workspace in the UI. **Backup/reset all demo data:** stop, then `npm run reset -- --confirm`. The old data is moved into `.demo/backups`; nothing is force-deleted.

## Five-minute flow

1. Sign in with Explore the local demo. Point to the four panes and seeded relationships.
2. Run Explore employees: explain JOIN, foreign key, ORDER BY and real result rows.
3. Choose Create + insert + select, run it, and point to notes in both schema views. Explain the semicolon inside a string.
4. Open SQL Coach, Ask Coach, and say “this response is labeled Local Coach because it uses deterministic rules.”
5. Interview -> Above the threshold -> Start challenge. Run, then submit:

```sql
SELECT id, name, salary
FROM employees
WHERE salary > 50000
ORDER BY id;
```

6. Show four hidden passes, elapsed time, score, and the dashboard best. Return to Practice and Reset workspace when finished.

## Explain these in one breath

- React state -> `fetch('/api/...')` -> Express middleware -> Passport `req.user.id` -> worker -> own SQLite file -> JSON -> React.
- `server/src/database.js`: application DB, persisted sessions, numeric workspace path.
- `server/src/sql.js`: quote-aware lexer, statement policy, prepared execution, result arrays, schema_version/PRAGMAs.
- `server/src/executor.js`: one job per user, four total, killable child and deadline.
- `server/src/interview.js`: attempt ownership, server deadline, one-time submission, score.
- `server/src/challenges.js` + `seeds.js`: reference query and four private test variants.
- `client/src/components/Schema.jsx`: metadata -> table cards and FK lines.
- `server/src/coach.js`: local rules or bounded server-only provider call.

**Scoring:** `round(80 * passed/4)` plus up to 20 time points only if all tests pass. **Order:** exact when requested; sorted multiset otherwise. **Errors:** stop after first failing statement; earlier statements remain committed. **Limits:** 32 KB SQL, 30 statements, 200 rows, 1 MB rows, 2.5 s worker, approximately 16 MiB DB.

## Before leaving for the interview

- Rehearse this once offline; keep charger connected and the localhost browser open.
- Run `npm run check`; verify `npm run demo` says **Demo ready**.
- Use localhost consistently; do not alternate with 127.0.0.1 for login cookies.
- Know that Windows reserved 5000/5173; fallback is expected, not a failure.
- Do not change Node/dependencies right before the interview.
- Read [INTERVIEW_GUIDE.md](INTERVIEW_GUIDE.md) and say the honest rebuild explanation.
- Live Google and valid-key OpenAI are **unverified**. Public deployment/tunnel is **blocked pending OS sandboxing**, not complete.

**Recovery:** Native module error -> stop and `npm run setup`. Busy port -> `npm run stop`; don't kill unrelated processes. DB locked -> stop duplicate app/DB editor, restart. Cookie issue -> use `http://localhost:15173`, log in again. Missing credentials -> use local demo and Local Coach. Full troubleshooting: [README](../README.md).
