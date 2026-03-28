import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import crypto from 'node:crypto'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema.js'
import { hashPassword, verifyPassword } from '../services/password.js'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

async function signToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .sign(secret)
}

export function createAuthRoutes(db: BetterSQLite3Database<typeof schema>) {
  const router = new Hono()

  router.post('/register', async (c) => {
    const body = await c.req.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return c.json({ error: result.error.issues[0].message }, 400)
    }

    const { name, email, password } = result.data

    const existing = db.select().from(schema.users).where(eq(schema.users.email, email)).get()
    if (existing) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(password)

    const user = {
      id,
      name,
      email,
      passwordHash,
      role: 'participant' as const,
      createdAt: new Date().toISOString(),
    }

    db.insert(schema.users).values(user).run()

    const token = await signToken(id, user.role)
    const { passwordHash: _, ...userWithoutPassword } = user

    return c.json({ data: { user: userWithoutPassword, token } })
  })

  router.post('/login', async (c) => {
    const body = await c.req.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return c.json({ error: result.error.issues[0].message }, 400)
    }

    const { email, password } = result.data

    const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get()
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const verification = await verifyPassword(password, user.passwordHash)
    if (!verification.valid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const token = await signToken(user.id, user.role)
    const { passwordHash: _, ...userWithoutPassword } = user

    return c.json({ data: { user: userWithoutPassword, token } })
  })

  return router
}
