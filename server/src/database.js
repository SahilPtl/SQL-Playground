import Database from 'better-sqlite3';
import session from 'express-session';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { config } from './config.js';
mkdirSync(path.join(config.dataDir, 'workspaces'), { recursive: true });
export const appDb = new Database(path.join(config.dataDir, 'app.db'));
appDb.pragma('journal_mode = WAL');
appDb.pragma('foreign_keys = ON');
appDb.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE,
 password_hash TEXT, google_id TEXT UNIQUE, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS interview_attempts (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), challenge_id TEXT NOT NULL,
 started_at INTEGER NOT NULL, deadline INTEGER NOT NULL, submitted_at INTEGER,
 score INTEGER DEFAULT 0, passed_tests INTEGER DEFAULT 0, total_tests INTEGER DEFAULT 4,
 status TEXT NOT NULL DEFAULT 'active', elapsed_seconds INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS attempts_user ON interview_attempts(user_id, challenge_id);
`);
export class SQLiteSessionStore extends session.Store {
  get(sid, done) { try { const row = appDb.prepare('SELECT data FROM sessions WHERE sid=? AND expires>?').get(sid, Date.now()); done(null, row ? JSON.parse(row.data) : null); } catch (e) { done(e); } }
  set(sid, data, done = () => {}) { try {
    appDb.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    appDb.prepare('INSERT OR REPLACE INTO sessions VALUES(?,?,?)').run(sid, JSON.stringify(data), Date.now() + 86400000); done();
  } catch (e) { done(e); } }
  destroy(sid, done = () => {}) { try { appDb.prepare('DELETE FROM sessions WHERE sid=?').run(sid); done(); } catch (e) { done(e); } }
  touch(sid, data, done) { this.set(sid, data, done); }
}
export function sessionSecret() {
  if (process.env.SESSION_SECRET?.length >= 32) return process.env.SESSION_SECRET;
  if (config.production) throw new Error('Production requires SESSION_SECRET of at least 32 characters.');
  const file = path.join(config.dataDir, '.session-secret');
  if (!existsSync(file)) writeFileSync(file, randomBytes(48).toString('hex'), { mode: 0o600 });
  return readFileSync(file, 'utf8');
}
export function workspacePath(userId) {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('Invalid workspace owner.');
  return path.join(config.dataDir, 'workspaces', `user-${userId}.db`);
}
