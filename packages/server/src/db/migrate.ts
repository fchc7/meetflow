import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type * as schema from './schema.js'

type Db = BetterSQLite3Database<typeof schema>

function resolveMigrationsFolder() {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  return join(currentDir, '../../drizzle')
}

export function runMigrations(db: Db) {
  migrate(db, { migrationsFolder: resolveMigrationsFolder() })
}
