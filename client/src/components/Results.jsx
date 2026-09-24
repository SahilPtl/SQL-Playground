export function Results({ result, busy }) {
  return (
    <section className="panel results-panel">
      <div className="panel-heading">
        <span>
          <b className="pane-number">04</b> RESULTS
        </span>
        <span className="muted">
          {busy
            ? "Executing…"
            : result
              ? `${result.statements?.length || 0} statements · ${result.executionTimeMs ?? "—"} ms`
              : "Ready when you are"}
        </span>
      </div>
      <div className="results-scroll" aria-live="polite">
        {!result ? (
          <div className="empty">
            <span className="empty-symbol">⌘</span>
            <h3>Your next insight starts with a query.</h3>
            <p>
              Run the sample SQL, or write your own. Ctrl + Enter to execute.
            </p>
          </div>
        ) : (
          <>
            {result.statements?.map((s) => (
              <div className="result-block" key={s.index}>
                <div className="result-title">
                  <span className="success">✓</span> Statement {s.index}{" "}
                  <span className="tag">{s.type}</span>
                  <small>
                    {s.rows
                      ? `${s.rowCount} rows${s.truncated ? " · limited to 200" : ""}`
                      : `${s.changes} rows affected`}{" "}
                    · {s.executionTimeMs} ms
                  </small>
                </div>
                {s.rows ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th className="row-index">#</th>
                          {s.columns.map((c, i) => (
                            <th key={i}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.rows.map((row, i) => (
                          <tr key={i}>
                            <td className="row-index">{i + 1}</td>
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className={cell === null ? "null-cell" : ""}
                              >
                                {cell === null ? "NULL" : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!s.rows.length && (
                      <p className="empty-small">
                        Query succeeded. No matching rows.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="statement-success">
                    Query executed successfully.
                  </p>
                )}
              </div>
            ))}
            {result.error && (
              <div className="error" role="alert">
                <strong>
                  SQL error · statement {result.error.statement}
                  {result.error.line
                    ? `, starting at line ${result.error.line}`
                    : ""}
                </strong>
                <p>{result.error.message}</p>
                <small>
                  Execution stopped. Earlier successful statements remain
                  committed.
                </small>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
