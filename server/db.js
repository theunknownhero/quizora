// SQLite database (Node's built-in node:sqlite — no extra packages).
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from './config.js'

mkdirSync(dirname(config.dbFile), { recursive: true })
export const db = new DatabaseSync(config.dbFile)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    email_verified_at INTEGER,
    profile TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  -- Only a SHA-256 hash of each session token is stored, so a leaked DB can't be used to log in.
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    user_agent TEXT
  );
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

  -- One-time tokens for email verification and password reset (also stored hashed).
  CREATE TABLE IF NOT EXISTS tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('verify', 'reset')),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS tokens_user ON tokens(user_id, kind);
`)

export const q = {
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userByLogin: db.prepare('SELECT * FROM users WHERE username = ? OR email = ?'),
  userByUsername: db.prepare('SELECT id FROM users WHERE username = ?'),
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  insertUser: db.prepare('INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)'),
  setProfile: db.prepare('UPDATE users SET profile = ? WHERE id = ?'),
  setPassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
  setVerified: db.prepare('UPDATE users SET email_verified_at = ? WHERE id = ?'),

  insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)'),
  session: db.prepare('SELECT * FROM sessions WHERE token_hash = ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
  deleteExpiredSessions: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),

  insertToken: db.prepare('INSERT INTO tokens (token_hash, user_id, kind, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'),
  token: db.prepare('SELECT * FROM tokens WHERE token_hash = ? AND kind = ?'),
  useToken: db.prepare('UPDATE tokens SET used_at = ? WHERE token_hash = ?'),
  voidTokens: db.prepare('UPDATE tokens SET used_at = ? WHERE user_id = ? AND kind = ? AND used_at IS NULL'),
  recentTokens: db.prepare('SELECT COUNT(*) AS n FROM tokens WHERE user_id = ? AND kind = ? AND created_at > ?'),
}

// Housekeeping: drop expired sessions hourly
setInterval(() => q.deleteExpiredSessions.run(Date.now()), 60 * 60 * 1000).unref()
