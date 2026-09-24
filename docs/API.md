# API and data model

Browser requests use relative `/api` URLs. Vite proxies to Express locally. Production Express serves `dist` and the API at one origin. All mutations require JSON. Authenticated endpoints derive the user from Passport's session; no public endpoint accepts a database path.

| Method | Path                                   | Input / result                                                  |
| ------ | -------------------------------------- | --------------------------------------------------------------- |
| GET    | `/api/health`                          | `{ok:true,service:"sql-playground"}`                            |
| GET    | `/api/auth/me`                         | Safe user or null; optional integration flags                   |
| POST   | `/api/auth/register`                   | `{name,email,password}`; creates account/session                |
| POST   | `/api/auth/login`                      | `{email,password}`; creates session                             |
| POST   | `/api/auth/logout`                     | `{}`; destroys session, keeps data                              |
| GET    | `/api/auth/google`                     | Only registered when OAuth is configured                        |
| GET    | `/api/auth/google/callback`            | Provider callback, state verification                           |
| GET    | `/api/schema`                          | Tables, column types, PK flags and FKs                          |
| POST   | `/api/sql/execute`                     | `{sql}`; statement results and schemaChanged                    |
| POST   | `/api/workspace/reset`                 | `{confirm:"RESET"}`; replaces only own practice DB              |
| GET    | `/api/interview/challenges`            | Public definitions; no solutions or hidden rows                 |
| GET    | `/api/interview/challenges/:id`        | Description, sample schema, active attempt, serverNow           |
| POST   | `/api/interview/challenges/:id/start`  | `{}`; new attempt/deadline, abandons previous active attempts   |
| POST   | `/api/interview/challenges/:id/run`    | `{attemptId,sql}`; fresh visible sample data                    |
| POST   | `/api/interview/challenges/:id/submit` | `{attemptId,sql}`; aggregate hidden results and score           |
| GET    | `/api/interview/progress`              | All-time summary, per-challenge bests, latest 100 attempts      |
| POST   | `/api/coach`                           | `{action,text}`; action is explain/hint/optimize/error/generate |

SQL errors within a valid batch return HTTP 200 with `success:false`, prior results and an error. Request validation may return 400. Missing auth is 401; forbidden Origin/Coach access is 403; duplicate email or attempt state conflict is 409; unsupported content type is 415; large body is 413; rate/capacity limits are 429. Grading timeouts fail the attempt without exposing dataset-specific errors.

## Example SQL result

```json
{
  "success": true,
  "statements": [
    {
      "index": 1,
      "line": 1,
      "type": "select",
      "success": true,
      "columns": ["answer"],
      "rows": [[42]],
      "rowCount": 1,
      "truncated": false,
      "executionTimeMs": 0.3
    }
  ],
  "error": null,
  "schemaChanged": false,
  "executionTimeMs": 1
}
```

`executionTimeMs` measures SQLite work, excluding process startup/network time. Wall time limits include process startup. Non-reader statements return `changes`; DDL reports success with zero affected rows.

## Application database

- `users(id PK, name, email UNIQUE nullable, password_hash nullable, google_id UNIQUE nullable, created_at)`.
- `sessions(sid PK, data JSON text, expires)`. Cookie contains a signed opaque session ID; user data is server-side. Expired rows are removed during session writes.
- `interview_attempts(id PK, user_id FK, challenge_id, started_at, deadline, submitted_at, score, passed_tests, total_tests, status, elapsed_seconds)`; index on `(user_id, challenge_id)`.
- Challenge metadata/reference SQL lives in `server/src/challenges.js`; datasets are in `server/src/seeds.js`.

Practice databases start with `departments(id PK, name UNIQUE)`, `employees(id PK, name, email UNIQUE, salary, department_id FK)` and `projects(id PK, name, department_id FK, budget)`. Four departments, eight employees and four projects give useful joins, empty departments, grouping and subqueries. These are synthetic identities at `example.test`.

## Grading contract

Exactly one read-only SELECT/WITH query; both keyword policy and `stmt.readonly` are checked, and SQLite `query_only` is enabled. Four fresh in-memory hidden variants include NULL salaries/departments, tied salaries, empty tables, duplicate names and different group sizes.

Column aliases and order must match the prompt. Row order matters only when specified. Otherwise comparison sorts serialized rows, preserving duplicate multiplicity. Numeric values are compared exactly by JSON representation, not with a floating-point tolerance.

`score = round(80 * passed / 4) + (allPassed ? floor(20 * max(0, 1 - elapsedSeconds / durationSeconds)) : 0)`.

The server records receipt time before grading; network arrival counts, grading time does not. Late submissions receive zero and expire the attempt. Failed submissions receive no time bonus. Each restart is a new tracked attempt. Startup marks interrupted `grading` attempts failed.
