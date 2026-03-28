import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { users } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import type * as schema from '../db/schema.js'

type Db = BetterSQLite3Database<typeof schema>

function stripPassword(user: typeof users.$inferSelect) {
  const { passwordHash, ...rest } = user
  return rest
}

const validRoles = ['admin', 'host', 'participant'] as const

export function createUserRoutes(db: Db) {
  const router = new Hono()

  router.use('*', authMiddleware)

  router.get('/', async (c) => {
    const userRole = c.get('userRole') as string
    if (userRole !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }
    const allUsers = await db.select().from(users).all()
    return c.json({ data: allUsers.map(stripPassword) })
  })

  router.get('/:id', async (c) => {
    const userId = c.get('userId') as string
    const userRole = c.get('userRole') as string
    const targetId = c.req.param('id')

    if (userRole !== 'admin' && userId !== targetId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const user = await db.select().from(users).where(eq(users.id, targetId)).get()
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({ data: { user: stripPassword(user) } })
  })

  router.patch('/:id', async (c) => {
    const userId = c.get('userId') as string
    const userRole = c.get('userRole') as string
    const targetId = c.req.param('id')

    if (userRole !== 'admin' && userId !== targetId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Invalid request body' }, 400)
    }

    const { name, email, role } = body as Record<string, unknown>
    const updates: Partial<typeof users.$inferInsert> = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return c.json({ error: 'Invalid name' }, 400)
      }
      updates.name = name.trim()
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return c.json({ error: 'Invalid email' }, 400)
      }
      updates.email = email
    }

    if (role !== undefined) {
      if (!validRoles.includes(role)) {
        return c.json({ error: 'Invalid role' }, 400)
      }
      if (userRole !== 'admin') {
        return c.json({ error: 'Only admins can change roles' }, 403)
      }
      updates.role = role
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400)
    }

    const existing = await db.select().from(users).where(eq(users.id, targetId)).get()
    if (!existing) {
      return c.json({ error: 'User not found' }, 404)
    }

    await db.update(users).set(updates).where(eq(users.id, targetId))

    const updated = await db.select().from(users).where(eq(users.id, targetId)).get()
    return c.json({ data: { user: stripPassword(updated!) } })
  })

  return router
}
