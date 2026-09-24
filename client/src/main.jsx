import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useParams,
  useLocation,
} from "react-router-dom";
import { api } from "./api";
import { Editor } from "./components/Editor";
import { SchemaBrowser, ERDiagram } from "./components/Schema";
import { Results } from "./components/Results";
import { Coach } from "./components/Coach";
import "./styles.css";
const samples = {
  "Explore employees": `SELECT e.name, d.name AS department, e.salary\nFROM employees e\nJOIN departments d ON e.department_id = d.id\nORDER BY e.salary DESC;`,
  "Select all": `SELECT * FROM employees;`,
  "Department summary": `SELECT d.name, COUNT(e.id) AS employee_count,\n       ROUND(AVG(e.salary), 2) AS average_salary\nFROM departments d\nLEFT JOIN employees e ON e.department_id = d.id\nGROUP BY d.id, d.name;`,
  "Create + insert + select": `CREATE TABLE IF NOT EXISTS notes (\n  id INTEGER PRIMARY KEY,\n  body TEXT NOT NULL,\n  employee_id INTEGER REFERENCES employees(id)\n);\nINSERT INTO notes (body, employee_id) VALUES ('Hello; SQL!', 1);\nSELECT * FROM notes;`,
  "Insert a project": `INSERT INTO projects (name, department_id, budget)\nVALUES ('Interview demo', 1, 12000);\nSELECT * FROM projects;`,
  "Above average salary": `SELECT name, salary FROM employees\nWHERE salary > (SELECT AVG(salary) FROM employees);`,
};
function App() {
  const [auth, setAuth] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/auth/me")
      .then(setAuth)
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <div className="center-page">
        <h1>Server unavailable</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Retry connection</button>
      </div>
    );
  if (!auth) return <div className="center-page">Opening your workspace…</div>;
  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth.user ? (
            <Navigate to="/playground" />
          ) : (
            <AuthPage auth={auth} setAuth={setAuth} />
          )
        }
      />
      <Route
        path="/register"
        element={
          auth.user ? (
            <Navigate to="/playground" />
          ) : (
            <AuthPage register auth={auth} setAuth={setAuth} />
          )
        }
      />
      <Route
        path="/*"
        element={
          auth.user ? (
            <Shell
              user={auth.user}
              onLogout={() => setAuth({ ...auth, user: null })}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
function AuthPage({ register = false, auth, setAuth }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const location = useLocation();
  const googleError = {
    google:
      "Google sign-in could not be completed. Try again, or use email/password.",
    google_denied:
      "Google sign-in was cancelled. Try again, or use email/password.",
    google_state:
      "This Google sign-in request is incomplete or expired. Start again with Continue with Google.",
    google_account:
      "An account already uses this email. Sign in with your existing password; Google accounts are not linked automatically.",
  }[new URLSearchParams(location.search).get("error")];
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const data = await api(
        register ? "/auth/register" : "/auth/login",
        values,
      );
      setAuth({ ...auth, user: data.user });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    setBusy(true);
    setError("");
    try {
      const data = await api("/auth/login", {
        email: "demo@example.test",
        password: "Playground2026!",
      });
      setAuth({ ...auth, user: data.user });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-icon">⌘</span> SQL<span>Playground</span>
        </div>
        <div>
          <span className="eyebrow">LESS THEORY. MORE QUERY.</span>
          <h1>
            A workspace for
            <br />
            your next <em>aha.</em>
          </h1>
          <p>
            Explore real data. See the relationships.
            <br />
            Build the confidence to explain every query.
          </p>
          <div className="query-preview">
            <div>
              <i />
              <i />
              <i />
              <span>first_insight.sql</span>
            </div>
            <pre>
              <b>SELECT</b> curiosity, practice
              <br />
              <b>FROM</b> your_next_chapter
              <br />
              <b>WHERE</b> possibility = <em>'limitless'</em>;
            </pre>
            <footer>✓ A little practice goes a long way.</footer>
          </div>
        </div>
        <p className="fine-print">
          SQLite under the hood. Your own persistent workspace.
        </p>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="eyebrow">YOUR SQL JOURNEY</span>
          <h2>{register ? "Make room to experiment." : "Welcome back."}</h2>
          <p className="muted">
            {register
              ? "Create your private SQL workspace."
              : "Pick up where your last query left off."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={60}
                />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={10}
                maxLength={72}
              />
            </label>
            {register && (
              <small className="muted">
                Use at least 10 characters (maximum 72 bytes).
              </small>
            )}
            <button className="primary wide" disabled={busy}>
              {busy
                ? "Opening workspace…"
                : register
                  ? "Create account →"
                  : "Sign in →"}
            </button>
          </form>
          {(error || googleError) && (
            <p className="error" role="alert">
              {error || googleError}
            </p>
          )}
          <div className="auth-divider">or</div>
          {auth.demoEnabled && (
            <button className="wide" disabled={busy} onClick={demo}>
              Explore the local demo
            </button>
          )}
          {auth.googleEnabled ? (
            <a className="button wide" href="/api/auth/google">
              Continue with Google
            </a>
          ) : (
            <>
              <button
                className="wide"
                disabled
                aria-describedby="google-unavailable"
              >
                Continue with Google
              </button>
              <p className="fine-print" id="google-unavailable">
                Google sign-in is not available yet. Email/password and the
                local demo work offline.
              </p>
            </>
          )}
          <p className="auth-switch">
            {register ? "Already have a workspace?" : "New here?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
function Shell({ user, onLogout }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await api("/auth/logout", {});
      onLogout();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/playground">
          <span className="brand-icon">⌘</span> SQL<span>Playground</span>
        </Link>
        <nav aria-label="Mode">
          <NavLink to="/playground">▦ Practice</NavLink>
          <NavLink to="/interview">◷ Interview</NavLink>
        </nav>
        <div className="account">
          <span className="local-badge">
            <span className="status-dot" /> LOCAL WORKSPACE
          </span>
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <span>{user.name}</span>
          <button className="text-button" disabled={busy} onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      {error && <div className="error">{error}</div>}
      <Routes>
        <Route path="/playground" element={<Playground />} />
        <Route path="/interview" element={<InterviewDashboard />} />
        <Route path="/interview/:id" element={<ChallengePage />} />
        <Route path="*" element={<Navigate to="/playground" replace />} />
      </Routes>
    </div>
  );
}
function Playground() {
  const [schema, setSchema] = useState({ tables: [] }),
    [schemaBusy, setSchemaBusy] = useState(true),
    [sql, setSql] = useState(samples["Explore employees"]),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [coach, setCoach] = useState(false),
    [reset, setReset] = useState(false);
  async function refresh() {
    setSchemaBusy(true);
    setError("");
    try {
      setSchema(await api("/schema"));
    } catch (e) {
      setError(e.message);
    } finally {
      setSchemaBusy(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function run() {
    if (busy || schemaBusy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api("/sql/execute", { sql });
      setResult(data);
      if (data.schemaChanged) await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function doReset() {
    setBusy(true);
    setError("");
    try {
      setSchema(await api("/workspace/reset", { confirm: "RESET" }));
      setResult(null);
      setSql(samples["Explore employees"]);
      setReset(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace">
      <div className="workspace-title">
        <div>
          <div className="breadcrumbs">
            WORKSPACE <span>/</span> PRACTICE
          </div>
          <h1>
            Room to experiment<span>.</span>
          </h1>
          <p>Real SQL. Your data. All the space to learn.</p>
        </div>
        <div className="workspace-actions">
          <button onClick={() => setReset(true)} disabled={busy || schemaBusy}>
            ↻ Reset workspace
          </button>
          <button className="coach-button" onClick={() => setCoach(true)}>
            ✧ SQL Coach
          </button>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="ide-grid">
        <SchemaBrowser
          schema={schema}
          onRefresh={refresh}
          busy={busy || schemaBusy}
        />
        <ERDiagram schema={schema} />
        <section className="panel editor-panel">
          <div className="panel-heading">
            <span>
              <b className="pane-number">03</b> SQL EDITOR
            </span>
            <span className="file-label">practice.sql</span>
          </div>
          <div className="editor-toolbar">
            <select
              aria-label="Sample SQL"
              defaultValue="Explore employees"
              onChange={(e) => setSql(samples[e.target.value])}
            >
              {Object.keys(samples).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <button
              className="text-button"
              onClick={() => setSql("")}
              disabled={busy}
            >
              Clear
            </button>
          </div>
          <Editor value={sql} onChange={setSql} onRun={run} />
          <div className="editor-footer">
            <span>
              SQLite <small>· Ctrl + Enter</small>
            </span>
            <button
              className="primary"
              onClick={run}
              disabled={busy || schemaBusy}
            >
              {busy ? "Running…" : "▶ Run query"}
            </button>
          </div>
        </section>
        <Results result={result} busy={busy} />
      </div>
      <footer className="workspace-foot">
        <span>
          <span className="status-dot" /> Connected to your private SQLite
          database
        </span>
        <span>
          30 statements / run · 200 rows / result · changes persist
          automatically
        </span>
      </footer>
      {coach && <Coach sql={sql} onClose={() => setCoach(false)} />}
      {reset && (
        <div className="overlay modal-wrap">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Reset workspace"
          >
            <h2>Start with a fresh dataset?</h2>
            <p>
              This replaces only your practice tables and data with the sample
              departments, employees, and projects. Interview scores and your
              account are kept.
            </p>
            <div>
              <button onClick={() => setReset(false)} disabled={busy}>
                Keep my data
              </button>
              <button className="danger" onClick={doReset} disabled={busy}>
                {busy ? "Resetting…" : "Reset my workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function InterviewDashboard() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api("/interview/challenges"), api("/interview/progress")])
      .then(([c, p]) => setData({ ...c, ...p }))
      .catch((e) => setError(e.message));
  }, []);
  const solved = data?.summary.solved || 0;
  return (
    <main className="interview-page">
      <div className="workspace-title">
        <div>
          <div className="breadcrumbs">
            WORKSPACE <span>/</span> INTERVIEW
          </div>
          <h1>
            Turn practice into confidence<span>.</span>
          </h1>
          <p>Eight challenges. Controlled datasets. A fair test of your SQL.</p>
        </div>
        <span className="tag">COACH OFF · SERVER TIMED</span>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="stats">
        <div>
          <span>CHALLENGES SOLVED</span>
          <strong>
            {solved}
            <small> / 8</small>
          </strong>
        </div>
        <div>
          <span>CHALLENGES ATTEMPTED</span>
          <strong>{data?.summary.attempted || 0}</strong>
        </div>
        <div>
          <span>BEST SCORE</span>
          <strong>
            {data?.summary.best || 0}
            <small> / 100</small>
          </strong>
        </div>
        <div>
          <span>AVERAGE SCORE</span>
          <strong>{data?.summary.average || 0}</strong>
        </div>
      </div>
      <div className="section-title">
        <h2>Choose your next challenge</h2>
        <span>Start easy. Stay curious.</span>
      </div>
      <div className="challenge-grid">
        {data?.challenges.map((c, i) => {
          const progress = data.byChallenge.find(
            (a) => a.challenge_id === c.id,
          );
          return (
            <Link
              className="challenge-card"
              to={"/interview/" + c.id}
              key={c.id}
            >
              <div>
                <span className={"difficulty " + c.difficulty.toLowerCase()}>
                  {c.difficulty}
                </span>
                <span className="muted">{c.durationSeconds / 60} min</span>
              </div>
              <span className="challenge-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <footer>
                <span>
                  {progress?.solved
                    ? "✓ Solved"
                    : progress?.attempts
                      ? "Attempted"
                      : "Not attempted"}
                </span>
                <span>
                  Best {progress?.best || 0} <b>↗</b>
                </span>
              </footer>
            </Link>
          );
        })}
      </div>
      <p className="fine-print">
        Unlimited fresh attempts. Each submission uses four hidden datasets. The
        server owns the timer and score.
      </p>
    </main>
  );
}
function ChallengePage() {
  const { id } = useParams();
  const [data, setData] = useState(null),
    [attempt, setAttempt] = useState(null),
    [sql, setSql] = useState("-- Write one SELECT query here\n"),
    [result, setResult] = useState(null),
    [score, setScore] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [offset, setOffset] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api("/interview/challenges/" + id)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setAttempt(d.attempt);
          setOffset(d.serverNow - Date.now());
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = score
    ? Math.max(
        0,
        (data?.challenge.durationSeconds || 0) - (score.elapsedSeconds || 0),
      )
    : attempt
      ? Math.max(0, Math.ceil((attempt.deadline - now - offset) / 1000))
      : data?.challenge.durationSeconds || 0;
  async function start() {
    setBusy(true);
    setError("");
    try {
      const d = await api(`/interview/challenges/${id}/start`, {});
      setAttempt(d.attempt);
      setOffset(d.serverNow - Date.now());
      setNow(Date.now());
      setScore(null);
      setResult(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function execute(submit = false) {
    if (busy || !attempt) return;
    setBusy(true);
    setError("");
    try {
      const d = await api(
        `/interview/challenges/${id}/${submit ? "submit" : "run"}`,
        { sql, attemptId: attempt.id },
      );
      if (submit) {
        setScore(d);
        setAttempt(null);
      } else setResult(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="interview-page">{error || "Loading challenge…"}</main>
    );
  return (
    <main className="challenge-page">
      <Link className="back-link" to="/interview">
        ← All challenges
      </Link>
      <div className="challenge-header">
        <div>
          <span
            className={"difficulty " + data.challenge.difficulty.toLowerCase()}
          >
            {data.challenge.difficulty}
          </span>
          <h1>{data.challenge.title}</h1>
          <p>{data.challenge.description}</p>
        </div>
        <div className="timer">
          <span>{score ? "ATTEMPT COMPLETE" : "TIME REMAINING"}</span>
          <strong>
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </strong>
          <small>Server-authoritative deadline</small>
        </div>
      </div>
      <div className="challenge-notice">
        <span>AI Coach is disabled during Interview Mode.</span>
        <span>Run = visible sample data · Submit = hidden tests</span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {score && (
        <div
          className={"score-card " + (score.correct ? "passed" : "")}
          role="status"
        >
          <strong>
            {score.correct ? "✓ Challenge solved" : "Keep practicing"}
          </strong>
          <span>
            Hidden tests: {score.passed} / {score.total}
          </span>
          <span>Score: {score.score} / 100</span>
          <span>{score.elapsedSeconds ?? "—"} seconds</span>
          {score.message && <p>{score.message}</p>}
        </div>
      )}
      <div className="challenge-workspace">
        <div className="challenge-schema">
          <SchemaBrowser schema={data.schema} label="challenge_sample" />
        </div>
        <section className="panel editor-panel">
          <div className="panel-heading">
            <span>YOUR SOLUTION</span>
            <button
              className="text-button"
              onClick={() => setSql("")}
              disabled={busy}
            >
              Clear
            </button>
          </div>
          <Editor value={sql} onChange={setSql} onRun={() => execute(false)} />
          <div className="editor-footer">
            <button onClick={start} disabled={busy}>
              {attempt ? "Restart challenge" : "Start challenge"}
            </button>
            <div>
              <button
                onClick={() => execute(false)}
                disabled={busy || !attempt || !seconds}
              >
                Run sample
              </button>
              <button
                className="primary"
                onClick={() => execute(true)}
                disabled={busy || !attempt || !seconds}
              >
                {busy ? "Checking…" : "Submit solution →"}
              </button>
            </div>
          </div>
        </section>
        <Results result={result} busy={busy} />
      </div>
      <p className="fine-print">
        Match the requested column aliases exactly.{" "}
        {data.challenge.ordered
          ? "Row order is checked."
          : "Row order is ignored; duplicate rows still count."}{" "}
        Each restart creates a new tracked attempt.
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
