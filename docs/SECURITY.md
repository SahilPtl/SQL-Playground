# Local-demo threat model

This is an authenticated SQL learning application for a trusted laptop demonstration. Arbitrary SQL is the product feature. **It is not a hardened public SQL sandbox.**

## Assets and boundaries

- `server/data/app.db`: bcrypt hashes, accounts, sessions, attempts and scores. Query workers never receive this connection or path.
- `server/data/workspaces/user-N.db`: one persistent practice database per authenticated numeric user ID. Client-supplied IDs and filenames are ignored.
- Challenge definitions, reference queries and hidden datasets: server modules only. They are absent from frontend responses and bundles. Since the repository is public, source readers can inspect them; this is educational grading, not a tamper-proof examination service.
- OAuth, Gemini, OpenAI and session secrets: server environment/private local storage. No `VITE_*` secrets. Workers receive only PATH and SystemRoot environment variables.

## Implemented controls

| Threat                             | Control                                                                                                             | Verification                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Other users' data                  | Auth middleware and integer-only path derivation                                                                    | Two-user API and browser checks                                                                |
| Application DB access              | Separate file; no path input; ATTACH/DETACH blocked                                                                 | App-table access and forged-path tests                                                         |
| Filesystem writes from SQL         | VACUUM, file functions, extensions, virtual tables, triggers and unrestricted PRAGMAs rejected                      | Adversarial SQL tests                                                                          |
| Extension loading                  | No extension loading API invoked; SQL `load_extension` rejected, including quoted spelling                          | Tests                                                                                          |
| SQL injection into account queries | Prepared bindings for account/session/attempt operations                                                            | Source review and authentication tests                                                         |
| Large requests/results             | 40 KB JSON, 32 KB SQL, 30 statements, 200 rows/result, 2,000-character cells, 1 MB row payload budget               | Input/row/byte limit tests                                                                     |
| Runaway execution                  | Killable child process; 2.5 seconds/job, 4 seconds/grading; 96 MB V8 old-space limit                                | Infinite recursive CTE and recovery tests                                                      |
| Database growth                    | 4,096 pages, normally 16 MiB at default 4 KiB pages                                                                 | 18 MB insert rejected with SQLITE_FULL                                                         |
| Concurrent pressure                | One active SQL job per user; four globally; 500 ms SQLite lock timeout                                              | Concurrent same-user test; global bound reviewed                                               |
| Password exposure                  | bcrypt cost 12, safe user projections, HttpOnly/SameSite=Lax cookies                                                | Tests                                                                                          |
| CSRF                               | JSON mutations, exact Origin check when present, no wildcard CORS, SameSite cookies                                 | Hostile-origin test                                                                            |
| Brute force/abuse                  | 30 auth/minute/IP, 150 API/minute/IP, 20 Coach/minute/IP                                                            | Middleware configured; sustained-load behavior not stress-tested                               |
| Hidden-test leakage                | Fresh controlled DB for each hidden variant; only aggregate grade leaves worker; internal grading errors suppressed | Tests for client response shape                                                                |
| Timer/score tampering              | Server timestamps, deadline check and one-time atomic submission claim                                              | Forged score, foreign attempt, expiry, replay tests                                            |
| Coach during an attempt            | Server rejects Coach while account has an active, unexpired or grading attempt                                      | API test                                                                                       |
| Provider failures                  | OpenAI: 6 seconds / 500 tokens; Gemini: 20 seconds / 2,048 tokens; safe errors and deterministic local fallback     | Provider failure tests, Gemini blocked/empty/truncated response tests and live Gemini response |

## SQL contract and limits

The lexer understands SQL strings (including doubled quotes), quoted identifiers, line comments and block comments. SQLite itself parses each prepared statement. Trigger bodies and explicit `BEGIN`/`COMMIT` transactions are intentionally unsupported. Metadata PRAGMAs are narrowly allowlisted. The conservative function-name check can reject harmless occurrences inside a string; it is not a full SQL authorizer.

The whole batch is lexed before execution. Lexical errors execute nothing. Otherwise statements commit sequentially. On a statement error, earlier successful statements remain committed and later statements do not run. On timeout, the parent kills the worker: SQLite journal recovery rolls back the interrupted write statement. Completed earlier statements remain committed. Reported line numbers identify the **start of the failing statement**, not SQLite's exact character offset. Timeout errors may omit a line number.

Temporary tables and connection PRAGMAs do not survive a job; persistent tables do. Result rows use arrays so duplicate column names remain distinguishable. Integers outside JavaScript's safe range become strings; BLOB values become size labels. Very large text cells are visibly truncated. Schema discovery shows up to 100 ordinary tables.

## Remaining limits / public-exposure decision

**Blocked for public exposure.** A child process is not an OS sandbox. It runs as the same OS user, and a native SQLite vulnerability would share that authority. The V8 memory flag does not cap native SQLite memory. Temporary allocations, journals, total accounts, total workspace storage and process-level resource use need stronger OS quotas. Four concurrent workers do not eliminate denial-of-service risk. Request throttles are in-memory and single-process.

There is no email verification, password recovery, MFA, audit pipeline, registration allowlist, per-account storage quota across files, or production backup automation. The development demo account has a deliberately public password. Production stops seeding it, but switching NODE_ENV does not erase an existing demo account: use a fresh private DATA_DIR.

Before a public launch: put SQL execution behind separate OS identities/filesystem mounts and hard CPU/RAM/PID/disk limits, restrict registration, provision fresh non-demo accounts and HTTPS, and run adversarial and load tests. On Linux this could use a dedicated worker service with namespaces/cgroups or a container per job. Containers are **not required for the local demo**. A security-reviewed native SQLite authorizer would strengthen the command policy.

The SQL/Coach routes do not log query contents or provider secrets. Production diagnostics currently contain startup messages and client-safe errors only; structured redacted operational logging is a planned improvement.

References: [SQLite ATTACH](https://www.sqlite.org/lang_attach.html), [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md).
