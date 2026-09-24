# SQL Playground

**Google sign-in:** see [the setup guide](docs/GOOGLE_SIGNIN_TRIAL.md) for the tested configuration on ports **15174/15001**, Google OAuth setup and optional OpenAI API key instructions.

A real SQL learning workspace: four-pane React IDE, persistent SQLite database per user, eight timed challenges with server-held grading datasets, and an offline Local Coach. Rebuilt with Codex assistance on **25 September 2026 (Asia/Kolkata)**. Earlier repository history is preserved; see [the honest rebuild record](docs/REBUILD.md).

## Start here - this Windows laptop

Open the actual folder in VS Code first:

```powershell
code "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground"
```

In VS Code choose **Terminal -> New Terminal**, using PowerShell:

```powershell
cd "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground"
npm run setup
npm run demo
```

`npm run setup` is the one-time clean install/native-module check. It needs npm registry access. After setup, **`npm run demo` is the single start command**; `npm run dev` is an identical alias. It seeds idempotently, starts both services, waits for health checks and prints the URL. No Docker, Google credentials, OpenAI key, `.env`, or separate database service is required.

**With the configured Google `.env` on this laptop, open [http://localhost:15174](http://localhost:15174).** API health: [http://localhost:15001/api/health](http://localhost:15001/api/health). Choose **Continue with Google**, or use the demo login: `demo@example.test` / `Playground2026!`. Keep this terminal running. After dependencies are installed, future starts only need `npm run dev`.

Without `.env` port overrides, the normal defaults are frontend **5173** and API **5000**. Windows on this laptop reserves both ports, so the launcher detects EACCES and selects **15173 / 15000**. The configured Google flow instead uses explicit **15174 / 15001** ports to match the registered callback. Only run one checkout on those ports at a time. The launcher does not bypass an occupied port; use the URL it prints.

Node **24 LTS** is recommended. This laptop's system Node is 20.16; the checked-in launcher can use the already-installed Codex Node 24 runtime as a local convenience. On other machines install Node 24 LTS before setup. Use the same Node for installation and running native dependencies. The runtime itself is not committed or downloaded by the launcher.

### Stop and reset

```powershell
npm run stop
```

Or press Ctrl+C in the demo terminal. The stop command addresses only this project's private local controller; it does not kill unrelated Node processes.

**Reset one workspace:** use Reset workspace in Practice and confirm. Account and interview scores remain. **Reset all local demo accounts/data with a backup:**

```powershell
npm run stop
npm run reset -- --confirm
npm run demo
```

The CLI refuses while demo ports are listening. It moves `server/data` into a timestamped `.demo/backups` directory, then the next start initializes fresh data. Keep backups private; they contain sessions and user data. Without `--confirm`, reset prints instructions and changes nothing. To restore a backup, stop the app, preserve the current data directory separately, then copy the chosen backup back to `server/data`.

## What works

- React/Vite, JavaScript, CSS Grid/Flexbox; schema browser, live ER diagram, CodeMirror SQL editor and per-statement result tables.
- Passport Local registration/login/logout, bcrypt hashes and persistent SQLite-backed sessions.
- A server-derived SQLite file per user; sample departments, employees and projects on first use.
- Actual SELECT/INSERT/UPDATE/DELETE/DDL, quote/comment-aware multi-statement processing, timings, affected rows, error statement/start line and predictable partial failure.
- Practice examples, Ctrl+Enter, Clear, refresh and confirmed reset.
- Eight Easy/Medium/Hard challenges; sample Run versus hidden Submit; server deadlines, ownership checks, tracked attempts, scoring and all-time progress.
- Local Coach for explanations, basic improvement/error hints and limited English-to-SQL templates. Optional server-only OpenAI gracefully falls back.
- Optional Google OAuth routes/button enabled only with complete configuration.
- Bounded worker processes, input/output/storage limits, restricted SQL commands, Origin policy, Helmet and throttling. This is **not yet a public hostile-user sandbox**.

See [VERIFICATION.md](docs/VERIFICATION.md) for verified, unverified and planned features. Live Google sign-in, authenticated SQL execution and session retention after reload were verified locally. Valid-key OpenAI generation remains **unverified**. Public hosting/tunnel is **blocked pending stronger worker isolation**; [DEPLOYMENT.md](docs/DEPLOYMENT.md) explains why.

## Architecture

```text
React / CodeMirror / Router
        | relative /api requests + session cookie
Express / Passport / JSON middleware
        |                       |
app.db (users/sessions/scores)   server-derived user ID
                                |
                         child-process executor
                           /                \
                user-N.db (practice)     fresh challenge DBs
                         metadata          aggregate grade
                              \            /
                              JSON response
```

Coach requests are separate from query execution. Only the learner's submitted practice text and schema can reach the optional provider. The Coach is disabled server-side during an active interview attempt.

## Repository layout

```text
client/
  src/main.jsx             # Routes and page-level state
  src/api.js               # JSON fetch boundary
  src/components/          # Editor, Schema/ER, Results, Coach
  src/styles.css
  vite.config.js
server/
  src/app.js               # HTTP middleware and routes
  src/auth.js              # Passport + bcrypt
  src/database.js          # App DB, sessions, workspace filenames
  src/sql.js               # Lexer, policy, execution, metadata
  src/executor.js          # Job concurrency and process timeout
  src/query-worker.js      # SQLite process entry
  src/interview.js         # Attempts and scoring
  src/challenges.js        # Private reference solutions
  src/seeds.js             # Visible and hidden data variants
  src/coach.js              # Local + optional provider
  test/                    # Real SQLite acceptance tests
  data/                    # Generated, private, gitignored
scripts/                   # Setup, start, stop, safe reset, preflight
docs/                      # Interview, API, security and deployment
.github/workflows/ci.yml
.env.example
package.json
package-lock.json
```

A single root package/lockfile avoids nested installs. No TypeScript, PostgreSQL or MongoDB is used.

## Configuration

No variables are mandatory for local development. The root `.env.example` documents optional overrides. `dotenv` reads a root `.env` if present. Never commit one.

| Variable                                | Local behavior                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| PORT / FRONTEND_PORT                    | Defaults 5000 / 5173; unconfigured Windows reservation fallback 15000 / 15173                  |
| CLIENT_URL                              | Launcher sets the printed localhost origin                                                     |
| DATA_DIR                                | Defaults to `server/data`; use private persistent storage when deploying                       |
| SESSION_SECRET                          | Random persistent local secret generated if absent; production requires at least 32 characters |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Blank disables Google login                                                                    |
| GOOGLE_CALLBACK_URL                     | Must match the authorized callback port/origin                                                 |
| OPENAI_API_KEY                          | Blank selects Local Coach; invalid/unavailable provider also falls back                        |
| OPENAI_MODEL                            | `gpt-4.1-mini` by default; successful valid-key flow unverified                                |
| NODE_ENV                                | Production requires HTTPS CLIENT_URL and secure secret, disables demo seeding                  |

Exact optional setup: [OAUTH_AND_AI.md](docs/OAUTH_AND_AI.md). API routes/schema/scoring: [API.md](docs/API.md).

## Five-minute demo

1. Sign in and show all four panes. Run the initial employee/department JOIN.
2. Choose **Create + insert + select**. Run it; explain three result sections and the new notes FK in the schema/ER diagram.
3. Open **SQL Coach**, ask for an explanation and point out **Local Coach**.
4. Open **Interview -> Above the threshold -> Start challenge**. Enter `SELECT id, name, salary FROM employees WHERE salary > 50000 ORDER BY id;`.
5. **Run sample**, then **Submit solution**. Show hidden-test count, score and elapsed time; explain the server deadline.
6. Return to the dashboard, then Practice. Use Reset workspace to restore the demo dataset.

Detailed spoken script, architecture, twelve-file walkthrough, actual debugging stories, **40 Q&As including ten JD-aligned questions**: [INTERVIEW_GUIDE.md](docs/INTERVIEW_GUIDE.md). Last-minute review: [CHEATSHEET.md](docs/CHEATSHEET.md).

## Tests and build

```powershell
npm run check
npm run format:check
npm run build
```

The backend tests create disposable temporary application/workspace databases. They do not touch your normal demo data. They verify real SQL, auth, isolation, partial failures, hidden grading, expiry/replay, missing/invalid integrations and resource limits. `npm run check` also builds the client and smoke-tests serving the built frontend. Browser acceptance is documented separately rather than claimed as a bundled automated browser suite.

`npm start` serves the built `dist` and API from Express. For this laptop use `$env:PORT='15000'` before running it if not using the demo launcher. Public production operation requires the deployment work described in the guide.

## WSL/Linux (additional, not required for this laptop)

Install Git and Node 24 LTS in Linux. Use a separate Linux clone; never share Windows `node_modules` across operating systems.

```bash
git clone https://github.com/SahilPtl/SQL-Playground.git ~/SQL-Playground
cd ~/SQL-Playground
code .
npm run setup
npm run demo
```

The usual UI is `http://localhost:5173`; use the printed URL if the launcher reports a reservation fallback. `npm run stop` and `npm run reset -- --confirm` are cross-platform Node scripts. The local WSL browser workflow was not exercised; CI covers the backend/build on Linux separately.

## Troubleshooting

| Symptom                                       | Recovery                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing script: dev                           | You are in the wrong folder or old checkout. `cd "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground"`; `npm run` lists dev and demo.                                                                                                                                                                         |
| better-sqlite3 / NODE_MODULE_VERSION mismatch | Stop the app, use Node 24 and `npm run setup`. Do not copy node_modules between Node versions or Windows/WSL. The pinned 12.8.0 was verified with a Windows prebuilt binary. If prebuild download is blocked, allow official GitHub/npm access; compiling instead requires Python and Visual Studio C++ Build Tools. |
| EACCES on 5000/5173                           | Expected reserved ranges on this laptop. Leave port overrides unset and the launcher selects 15000/15173. `netsh interface ipv4 show excludedportrange protocol=tcp` explains the reservation; do not delete system exclusions.                                                                                      |
| EADDRINUSE on 15000/15173                     | Run `npm run stop`. If another program owns the port, close it deliberately; the launcher will not kill it. Inspect with `Get-NetTCPConnection -LocalPort 15000,15173`.                                                                                                                                              |
| Frontend cannot connect                       | Wait for Demo ready. Visit API health, inspect the terminal, then stop/start. The proxy and child API port are configured together by the launcher.                                                                                                                                                                  |
| Cookies/session fail                          | Use `localhost` consistently, not a mixture of localhost and 127.0.0.1. Clear this site's cookie and sign in. NODE_ENV=production sets Secure cookies and needs HTTPS. A full data reset invalidates old sessions.                                                                                                   |
| Database locked                               | Stop duplicate app processes and external SQLite editors, then retry. A job has a 500 ms lock timeout. Do not delete a live database/journal. For persistent OneDrive contention, move DATA_DIR to a private non-synced directory and keep it consistent.                                                            |
| Database full                                 | The workspace has a roughly 16 MiB limit. Drop large learning tables or use the confirmed UI reset.                                                                                                                                                                                                                  |
| Google credentials missing/rejected           | Local signup/login stays available. Leave optional fields blank or follow the OAuth guide. Return from Google's invalid-client error page to local login.                                                                                                                                                            |
| AI key missing/invalid/offline                | Local Coach is expected. Read its provider label. Unsupported English requests are explicitly declined rather than fabricated.                                                                                                                                                                                       |
| Coach disabled in Practice                    | An active Interview attempt exists in this account. Submit it or wait for expiry; a second tab cannot bypass this restriction.                                                                                                                                                                                       |
| Runtime missing                               | Install Node 24 LTS and reopen the terminal. This laptop can also use the existing bundled runtime through the wrapper.                                                                                                                                                                                              |

## Pre-interview checklist

Run setup in advance while online. Verify `npm run check`, start once, rehearse the five-minute sequence offline, restore sample data, and keep the browser/terminal open. Avoid dependency upgrades on interview morning. Read the twelve files and explain the actual rebuild/AI assistance honestly. Know that credentials-based successes and public deployment are not verified. A personal phone number, email, real key or token is never needed in this repository.
