import Database from 'better-sqlite3';
const db = new Database('users.db');

db.exec(`CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  tokens TEXT NOT NULL,
  profile TEXT
)`);

export function getAllUsers() {
  return db.prepare('SELECT * FROM users').all();
}

export function getUser(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function upsertUser(email, tokens, profile) {
  db.prepare(`INSERT INTO users (email, tokens, profile) VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET tokens=excluded.tokens, profile=excluded.profile`).run(email, JSON.stringify(tokens), JSON.stringify(profile));
} 