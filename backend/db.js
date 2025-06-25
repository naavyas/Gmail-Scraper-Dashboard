import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({
  filename: 'users.db',
  driver: sqlite3.Database
});

export async function getAllUsers() {
  const db = await dbPromise;
  return db.all('SELECT * FROM users');
}

export async function getUser(email) {
  const db = await dbPromise;
  return db.get('SELECT * FROM users WHERE email = ?', email);
}

export async function upsertUser(email, tokens, profile) {
  const db = await dbPromise;
  await db.run(`
    INSERT INTO users (email, tokens, profile)
    VALUES (?, ?, ?)
    ON CONFLICT(email)
    DO UPDATE SET tokens=excluded.tokens, profile=excluded.profile
  `, [email, JSON.stringify(tokens), JSON.stringify(profile)]);
}

// Ensure table exists on startup
(async () => {
  const db = await dbPromise;
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    tokens TEXT NOT NULL,
    profile TEXT
  )`);
})(); 