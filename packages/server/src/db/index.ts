import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema.js'

type DrizzleDb = BetterSQLite3Database<typeof schema>

export function createDb(filename?: string): { db: DrizzleDb; sqlite: Database.Database } {
  const sqlite = filename === undefined || filename === ':memory:'
    ? new Database(':memory:')
    : new Database(filename)
  const db = drizzle(sqlite, { schema })
  return { db, sqlite }
}

export function createTestDb() {
  const { db, sqlite } = createDb(':memory:')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'participant',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      capacity INTEGER NOT NULL,
      equipment TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      agenda TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room_id TEXT NOT NULL REFERENCES rooms(id),
      host_id TEXT NOT NULL REFERENCES users(id),
      recurrence TEXT NOT NULL DEFAULT 'none',
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meeting_participants (
      meeting_id TEXT NOT NULL REFERENCES meetings(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      PRIMARY KEY (meeting_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      meeting_id TEXT NOT NULL REFERENCES meetings(id),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL REFERENCES meetings(id),
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      url TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
  `)
  return db
}

const { db } = createDb('meetflow.db')
export { db }
