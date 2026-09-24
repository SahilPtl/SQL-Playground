// A small lexer, not a SQL grammar. SQLite still parses every statement.
// Trigger bodies and explicit transactions are intentionally unsupported.
export function splitSQL(sql) {
  if (typeof sql !== 'string' || !sql.trim()) throw new Error('Enter a SQL query before running.');
  if (Buffer.byteLength(sql) > 32768) throw new Error('SQL input limit is 32 KB.');
  const statements = [];
  let start = 0, line = 1, startLine = 1, state = 'normal', words = '', meaningful = false;
  const push = end => {
    if (meaningful) statements.push({ sql: sql.slice(start, end).trim(), line: startLine, tokens: words.toUpperCase().match(/[A-Z_][A-Z_0-9]*/g) || [] });
    start = end; startLine = line; words = ''; meaningful = false;
  };
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], n = sql[i + 1];
    if (c === '\n') line++;
    if (state === 'line') { if (c === '\n') { state = 'normal'; words += ' '; } continue; }
    if (state === 'block') { if (c === '*' && n === '/') { state = 'normal'; words += ' '; i++; } continue; }
    if (state !== 'normal') {
      const end = state === '[' ? ']' : state;
      if (c === end) { if (n === end && state !== '[') i++; else { state = 'normal'; words += ' '; } }
      continue;
    }
    if (c === '-' && n === '-') { state = 'line'; i++; continue; }
    if (c === '/' && n === '*') { state = 'block'; i++; continue; }
    if (!meaningful && !/\s|;/.test(c)) { meaningful = true; startLine = line; }
    if ("'\"`[".includes(c)) { state = c; words += ' '; continue; }
    if (c === ';') { push(i + 1); continue; }
    words += c;
  }
  if (!['normal','line'].includes(state)) throw new Error('Unterminated SQL string, identifier, or comment.');
  push(sql.length);
  if (!statements.length) throw new Error('Enter a SQL statement, not only comments.');
  if (statements.length > 30) throw new Error('At most 30 statements per run.');
  return statements;
}
export function validateStatement(statement, readOnly = false) {
  const tokens = statement.tokens, first = tokens[0];
  const allowed = ['SELECT','WITH','EXPLAIN','INSERT','UPDATE','DELETE','CREATE','ALTER','DROP','REPLACE','PRAGMA'];
  if (!allowed.includes(first)) throw new Error('This command is unavailable. ATTACH, VACUUM, explicit transactions and file access are disabled.');
  if (tokens.some(t => ['ATTACH','DETACH','VACUUM','TRIGGER','VIRTUAL','LOAD_EXTENSION','WRITEFILE','READFILE'].includes(t))) throw new Error('File operations, extensions, virtual tables and triggers are disabled.');
  // Also catch quoted function/pragma identifiers. False positives in literals
  // are an explicit conservative tradeoff for this local educational service.
  if (/load_extension|readfile|writefile|pragma_/i.test(statement.sql)) throw new Error('File and table-valued PRAGMA functions are disabled.');
  if (first === 'PRAGMA' && (!/^\s*PRAGMA\s+(table_info|table_xinfo|foreign_key_list|index_list|index_info)\s*\(\s*(?:[A-Za-z_][\w]*|'(?:[^']|'')*'|"(?:[^"]|"")*")\s*\)\s*;?\s*$/i.test(statement.sql))) throw new Error('Only read-only table_info, foreign_key_list, and index metadata PRAGMAs are allowed.');
  if (readOnly && !['SELECT','WITH'].includes(first)) throw new Error('Interview solutions must be one read-only SELECT or WITH query.');
}
const quote = name => '"' + name.replaceAll('"', '""') + '"';
export function getSchema(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name LIMIT 100").all();
  return { tables: tables.map(({name}) => ({ name,
    columns: db.pragma(`table_info(${quote(name)})`).map(c => ({name:c.name,type:c.type,primaryKey:Boolean(c.pk),notNull:Boolean(c.notnull)})),
    foreignKeys: db.pragma(`foreign_key_list(${quote(name)})`).map(f => ({from:f.from,table:f.table,to:f.to}))
  })) };
}
export function runStatements(db, sql, { readOnly = false, onStatement = () => {} } = {}) {
  const parsed = splitSQL(sql);
  if (readOnly && parsed.length !== 1) throw new Error('Submit exactly one read-only query.');
  const before = db.pragma('schema_version', { simple: true });
  const results = [], started = performance.now();
  let bytes = 0, error = null;
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i], time = performance.now();
    try {
      validateStatement(item, readOnly);
      const stmt = db.prepare(item.sql);
      if (readOnly && !stmt.readonly) throw new Error('Only read-only queries are allowed in Interview Mode.');
      const result = { index:i + 1, line:item.line, type:item.tokens[0].toLowerCase(), success:true };
      if (stmt.reader) {
        result.columns = stmt.columns().map(c => c.name); result.rows = []; result.truncated = false;
        for (const raw of stmt.raw().iterate()) {
          if (result.rows.length >= 200) { result.truncated = true; break; }
          const row = raw.map(v => Buffer.isBuffer(v) ? `[BLOB: ${v.length} bytes]` : typeof v === 'string' && v.length > 2000 ? v.slice(0,2000) + '… [truncated]' : typeof v === 'bigint' ? (v <= BigInt(Number.MAX_SAFE_INTEGER) && v >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(v) : String(v)) : v);
          bytes += Buffer.byteLength(JSON.stringify(row));
          if (bytes > 1000000) throw new Error('Result exceeds the 1 MB response limit. Add a LIMIT or select fewer columns.');
          result.rows.push(row);
        }
        result.rowCount = result.rows.length;
      } else { result.changes = Number(stmt.run().changes); }
      result.executionTimeMs = Math.round((performance.now() - time) * 100) / 100;
      results.push(result); onStatement(result);
    } catch (e) { error = { statement:i + 1, line:item.line, message:e.message }; break; }
  }
  return { success:!error, statements:results, error, schemaChanged:before !== db.pragma('schema_version', {simple:true}), executionTimeMs:Math.round(performance.now()-started) };
}
