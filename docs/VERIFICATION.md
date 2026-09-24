# Verification record

## Google sign-in side-branch follow-up

Live Google sign-in completed on 25 September 2026 after credentials were imported into the ignored local `.env`. The browser reached authenticated Practice, the sample JOIN returned eight rows, and the session survived a page reload. The user then approved merging into main. No credential or personal account information is included in this record. Valid-key OpenAI generation is still unverified.

On `feature/google-signin-setup`, `npm run check` passed **18 tests**, the production build and static-serving smoke. Four added Google callback integration tests use simulated provider transport with real Passport state/profile/session handling. They verify successful and repeat login, persistent workspaces, isolation, safe session fields, logout cookie clearing, local-account collisions, invalid/replayed state, cancellation and token failure. They do not establish live Google credential validity. See [the trial guide](GOOGLE_SIGNIN_TRIAL.md) for separate ports, data and cookie configuration. The rebuild record below describes the original 14-test milestone.

Local work date: **25 September 2026, Asia/Kolkata** (GitHub stores corresponding UTC timestamps). Machine: Windows PowerShell; system Node 20.16; execution/install runtime Node 24.19; npm lockfile committed; better-sqlite3 pinned to 12.8.0; Vite 8.3.1. No `.env` or valid Google/OpenAI credential was used for the core walkthrough.

## Implemented and verified

| Feature                             | Evidence                                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Clean Windows install/native SQLite | `npm run setup` succeeded from a clean dependency installation; native memory DB opened                                            |
| Root demo/dev launcher              | Frontend and API health checks completed; demo printed actual 15173/15000 URL                                                      |
| Windows reserved-port handling      | EACCES confirmed by socket probes and Windows exclusion ranges; automatic fallback worked                                          |
| Duplicate start / stop              | Duplicate launch reported EADDRINUSE without touching active process; `npm run stop` stopped the demo                              |
| Safe CLI reset                      | Refused while active; after stop moved data into timestamped `.demo/backups`; fresh start checked                                  |
| Local auth                          | API signup/login/logout/session tests; demo login and second-account registration in browser                                       |
| Four panes/editor/results           | Real browser inspection: explorer, ER, CodeMirror highlighting/line numbers and per-statement results                              |
| SQL and schema                      | SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER tests; browser SELECT + CREATE/INSERT/SELECT; live new FK metadata                   |
| Non-naive batching                  | Semicolons inside strings, escaped quotes, quoted identifiers and comments covered                                                 |
| Partial failure                     | Prior successful write persisted, later statements skipped; statement/start-line reported                                          |
| Persistence                         | Browser logout/login preserved notes table; API verification also passed                                                           |
| Two-user isolation                  | Second browser account could not query first account's notes; forged path/user API test passed                                     |
| Practice reset                      | Browser confirmation restored departments/employees/projects; SELECT worked afterward                                              |
| Interview challenges                | All eight reference queries passed all four hidden variants in real SQLite; incorrect query failed                                 |
| Run vs Submit                       | Browser sample returned visible data; submission returned 4/4, score and elapsed time                                              |
| Server timing/score                 | Expired, replayed, forged-score and foreign-user submissions tested; attempts persisted                                            |
| Local Coach                         | Browser no-key response labeled Local Coach; limited generation and explanations tested                                            |
| Invalid provider recovery           | Mocked 401/429/500/network failures; real deliberately invalid-key request returned Local Coach                                    |
| Invalid OAuth configuration         | App booted, local auth/SQL/Coach/Interview passed; Google redirect and denied callback tested                                      |
| Resource controls                   | Input, statement count, row count, byte budget, ~16 MiB database limit, runaway-query deadline and recovery, same-user concurrency |
| Build                               | Production client build passed; static-serving smoke check recorded by `npm run check`                                             |
| Exposure preflight                  | `npm run preview:check` deliberately failed with documented OS-sandbox blockers; no tunnel launched                                |

Automated suite: **14 backend tests**, using disposable temporary application DBs and real better-sqlite3 workspaces. Tests live in `server/test/core.test.js` and `server/test/invalid-config.test.js`. Browser acceptance was performed through the app UI; it is not represented as an automated Playwright suite in this repository.

## Implemented but unverified in the live external environment

- Successful OpenAI generation using a valid key: no valid key available. A mocked successful response tests only the adapter.
- Production HTTPS/reverse proxy, secure-cookie deployment, backup/restore operations on a cloud host: documented design, not provisioned.
- A real WSL desktop/browser walkthrough: not performed. Remote Linux CI status must be checked separately.
- A Cloudflare Tunnel end-to-end launch: not performed; cloudflared absent and the exposure preflight blocks it. The documented vendor command is not claimed as tested.
- Sustained hostile-load handling and OS isolation: not established by the local test suite.

## Planned, not implemented

OS-enforced worker filesystem/native-memory/CPU quotas, distributed job queue and throttling, email verification/password recovery/MFA, production registration restrictions, scheduled encrypted backups with restore drills, and a durable public deployment.

## GitHub CI

The workflow checks Node 24 on Windows and Ubuntu with clean `npm ci`, backend tests, build/static smoke and formatting. Consult the linked Actions checks on the delivery PR for the actual run result; workflow configuration alone is not verification. Final delivery notes report the observed remote check state.

Observed remote result: [PR verification run 36053740539](https://github.com/SahilPtl/SQL-Playground/actions/runs/36053740539) completed successfully on **both windows-latest and ubuntu-latest** for commit `be01db192368fe18766d15304fd73dba13b163f5`. Every install, check and formatting step passed. Later documentation/cleanup commits trigger fresh checks; their status is visible on [PR #1](https://github.com/SahilPtl/SQL-Playground/pull/1).

## Known intentional limits

No triggers, explicit multi-request transactions, ATTACH/VACUUM/file operations or writable PRAGMAs. Schema discovery caps ordinary tables at 100. Results cap rows and cell lengths. Error line refers to statement start, not exact character. Child-process isolation is not OS sandboxing. Hidden tests are excluded from browser data but visible in this public source repository. The Vite build may report a non-fatal large-chunk warning because CodeMirror and the app are bundled together.
