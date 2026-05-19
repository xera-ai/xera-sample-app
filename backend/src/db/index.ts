import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

const dbPath = process.env.DB_PATH ?? './data/app.db'

// Create data directory if it doesn't exist
try {
  mkdirSync(dirname(dbPath), { recursive: true })
} catch {
  // Directory already exists
}

export const sqliteDb = new Database(dbPath)

sqliteDb.pragma('journal_mode = WAL')
sqliteDb.pragma('foreign_keys = ON')

// Create tables if they don't exist
sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used_at INTEGER,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id TEXT NOT NULL,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    assignee_id TEXT,
    due_date TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_labels (
    task_id TEXT NOT NULL,
    label_id TEXT NOT NULL
  );
`)

// Add columns for existing DBs that predate schema changes
for (const [table, col, type] of [
  ['tasks', 'updated_at', 'INTEGER'],
  ['comments', 'updated_at', 'INTEGER'],
] as const) {
  try { sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`) } catch { /* already exists */ }
}

export const db = drizzle(sqliteDb, { schema })
