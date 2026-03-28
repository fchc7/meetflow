import 'dotenv/config'
import crypto from 'node:crypto'
import { db } from './db/index.js'
import { users } from './db/schema.js'
import { hashPassword } from './services/password.js'

const seedUsers = [
  { id: crypto.randomUUID(), name: 'Admin', email: 'admin@meetflow.com', role: 'admin' as const, password: 'admin123' },
  { id: crypto.randomUUID(), name: 'Host', email: 'host@meetflow.com', role: 'host' as const, password: 'host123' },
  { id: crypto.randomUUID(), name: 'User', email: 'user@meetflow.com', role: 'participant' as const, password: 'user123' },
]

for (const user of seedUsers) {
  db.insert(users).values({
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: await hashPassword(user.password),
    role: user.role,
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing({
    target: users.email,
  }).run()

  console.log(`${user.role}: ${user.email} / ${user.password}`)
}
