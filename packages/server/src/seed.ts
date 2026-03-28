import 'dotenv/config'
import Database from 'better-sqlite3'
import crypto from 'node:crypto'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

const sqlite = new Database('meetflow.db')

const users = [
  { id: crypto.randomUUID(), name: 'Admin', email: 'admin@meetflow.com', role: 'admin', password: 'admin123' },
  { id: crypto.randomUUID(), name: 'Host', email: 'host@meetflow.com', role: 'host', password: 'host123' },
  { id: crypto.randomUUID(), name: 'User', email: 'user@meetflow.com', role: 'participant', password: 'user123' },
]

const insert = sqlite.prepare(
  `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`
)

for (const u of users) {
  insert.run(u.id, u.name, u.email, hashPassword(u.password), u.role, new Date().toISOString())
  console.log(`${u.role}: ${u.email} / ${u.password}`)
}

sqlite.close()
