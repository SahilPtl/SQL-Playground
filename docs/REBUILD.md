# Repository inspection and honest history

Inspected `https://github.com/SahilPtl/SQL-Playground` before replacement. Default branch: `main`. Fetch and push URL: `https://github.com/SahilPtl/SQL-Playground.git`. Original HEAD: `f2ccb5abb8237efaf860994b6757e1cc707aa685` (`Create README.md`), following `1d31685` (`Initial commit`).

The original implementation contained CommonJS Express 5, CORS, dotenv, `pg` and `postgres`; a PostgreSQL `Pool`; user CRUD, query execution and log routes; and a schema for users, query logs, products, customers and orders. These capabilities were identified by source inspection, **not verified against a running PostgreSQL instance**. There was no React frontend, Passport login, SQLite workspace isolation, timed interview engine or AI Coach. The sole test script intentionally failed, and no root dev script existed. `node_modules` was committed. The query route trusted a supplied `userId` and ran in a shared database. Arbitrary SQL could therefore reach application tables.

The old schema's small relational examples were useful context. No old runtime code or dependency directory was reused in the new architecture. There were no frontend assets worth carrying forward.

Before replacing files, the exact original HEAD was saved remotely as [archive/pre-rebuild-2026-09-25](https://github.com/SahilPtl/SQL-Playground/tree/archive/pre-rebuild-2026-09-25). Work proceeded on `rebuild/offline-interview`, retaining the original commits as ancestors. No force-push, deletion of history, or timestamp manipulation was used. The old tracked dependencies were removed from the new tree but remain in archived history.

Authenticated GitHub work used only the connector verified as **SahilPtl** (ID 136913468). The repository owner and push URL were checked. Local author identity was set to `SahilPtl` with the GitHub numeric no-reply address. No PAT was found or required; no credential from another account was used.

## What to say in the interview

“My earlier repository was a small PostgreSQL/Express scaffold. I rebuilt the current version with Codex assistance on 25 September 2026 to make the promised learning workflow real and testable. I did not develop this version over several earlier days. The rebuilt code uses React, Express, Passport and per-user SQLite files. I verified its behavior through backend tests and a browser demo, and I can walk through the query isolation, result comparison and timer logic. Google login and valid-key AI integration are implemented but I have not completed a live successful credentials-based test.”

Only say that you understand a component after reading and explaining it yourself. This guide provides preparation material, not evidence of personal experience or a claim that AI-generated code is automatically correct.

## Debugging events actually observed in this rebuild

1. **Native Node ABI mismatch.** System Node was 20.16, while the bundled runtime was 24.19. An install lifecycle initially selected the wrong binary. A clean install launched consistently through the Node 24 wrapper fixed it. `better-sqlite3` 13 attempted a compiler build without Visual Studio tools; pinned 12.8.0 supplied a working prebuilt binary. `npm run setup` now checks native loading.
2. **Port diagnosis.** A first startup message assumed the defaults were occupied. Socket probes returned EACCES, and Windows' exclusion list included 5000 and 5173. Startup now distinguishes EACCES from EADDRINUSE and uses the 15000/15173 fallback only for reserved default ports.
3. **CSS build error.** An unnecessary empty data-URL CSS import caused Vite's CSS processor to treat it as a file. Removing it fixed the build. No remote fonts or CDN scripts are required.
4. **Browser verification details.** The second account could not query the first account's notes. A semicolon in `Hello; SQL!` stayed inside one SQL string. The solved challenge returned four hidden passes and a score based on server time. A selector timeout during automation was a test locator issue; the accessibility tree confirmed persisted data.
5. **Review refinements.** The completion timer originally reverted to the starting duration and sample schema was labeled personal. The displayed completion state and sample label were corrected. All-time summaries were moved to SQL aggregates rather than being inferred from only the latest 100 attempts.
6. **Keyboard precedence.** A real browser check showed Ctrl+Enter inserted a blank line instead of running SQL. CodeMirror's basicSetup binding took precedence. Moving the custom keymap before basicSetup fixed it; the browser then returned 42 from a keyboard-triggered query.
