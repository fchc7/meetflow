import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../schema.js'
import { runMigrations } from '../migrate.js'

describe('database migrations', () => {
  it('creates the expected tables and columns', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'meetflow-migrate-'))
    const dbPath = join(tempDir, 'test.db')
    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite, { schema })

    try {
      runMigrations(db)

      const tables = sqlite.prepare(`
        SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      `).all() as Array<{ name: string }>

      expect(tables.map((table) => table.name)).toEqual(
        expect.arrayContaining([
          '__drizzle_migrations',
          'users',
          'rooms',
          'meetings',
          'meeting_participants',
          'notifications',
          'attachments',
        ]),
      )

      const meetingColumns = sqlite.prepare(`PRAGMA table_info(meetings)`).all() as Array<{ name: string }>
      expect(meetingColumns.map((column) => column.name)).toEqual(
        expect.arrayContaining(['series_id', 'recurrence_ends_at']),
      )
    } finally {
      sqlite.close()
      if (existsSync(dbPath)) {
        rmSync(tempDir, { recursive: true, force: true })
      }
    }
  })
})
