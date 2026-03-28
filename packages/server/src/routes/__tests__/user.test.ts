import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import { createTestDb } from '../../db/index.js'
import { users } from '../../db/schema.js'
import { createUserRoutes } from '../user.routes.js'

const secret = new TextEncoder().encode('dev-secret')

async function createToken(userId: string, role: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .sign(secret)
}

async function seedUsers(db: ReturnType<typeof createTestDb>) {
  await db.insert(users).values([
    {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@test.com',
      passwordHash: 'hash_admin',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'user-1',
      name: 'Regular User',
      email: 'user@test.com',
      passwordHash: 'hash_user1',
      role: 'participant',
      createdAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: 'user-2',
      name: 'Host User',
      email: 'host@test.com',
      passwordHash: 'hash_user2',
      role: 'host',
      createdAt: '2024-01-03T00:00:00.000Z',
    },
  ])
}

function createApp() {
  const db = createTestDb()
  const app = new Hono()
  app.route('/api/users', createUserRoutes(db))
  return { app, db }
}

describe('User Routes', () => {
  describe('GET /api/users', () => {
    it('returns 401 without auth token', async () => {
      const { app } = createApp()
      const res = await app.request('/api/users')
      expect(res.status).toBe(401)
    })

    it('allows participant users to list users', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('user-1', 'participant')
      const res = await app.request('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBeDefined()
      expect(body.data.length).toBeGreaterThan(0)
    })

    it('allows host users to list users without password hashes', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('user-2', 'host')
      const res = await app.request('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(3)
      for (const user of body.data) {
        expect(user).not.toHaveProperty('passwordHash')
      }
    })

    it('returns list of users without password hashes for admin', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('admin-1', 'admin')
      const res = await app.request('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(3)
      for (const user of body.data) {
        expect(user).not.toHaveProperty('passwordHash')
        expect(user).not.toHaveProperty('password_hash')
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('name')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('role')
      }
    })
  })

  describe('GET /api/users/:id', () => {
    it('returns 401 without auth', async () => {
      const { app } = createApp()
      const res = await app.request('/api/users/user-1')
      expect(res.status).toBe(401)
    })

    it('returns user by id without password hash', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('user-1', 'participant')
      const res = await app.request('/api/users/user-1', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user).toMatchObject({
        id: 'user-1',
        name: 'Regular User',
        email: 'user@test.com',
        role: 'participant',
      })
      expect(body.data.user).not.toHaveProperty('passwordHash')
      expect(body.data.user).not.toHaveProperty('password_hash')
    })

    it('returns 404 if user not found', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('admin-1', 'admin')
      const res = await app.request('/api/users/nonexistent', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(404)
    })

    it('returns 403 if regular user tries to view another user', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('user-1', 'participant')
      const res = await app.request('/api/users/user-2', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(403)
    })

    it('allows admin to view any user', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('admin-1', 'admin')
      const res = await app.request('/api/users/user-2', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.id).toBe('user-2')
    })
  })

  describe('PATCH /api/users/:id', () => {
    it('returns 401 without auth', async () => {
      const { app } = createApp()
      const res = await app.request('/api/users/user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })
      expect(res.status).toBe(401)
    })

    it('updates own user name and email', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('user-1', 'participant')
      const res = await app.request('/api/users/user-1', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name', email: 'updated@test.com' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.name).toBe('Updated Name')
      expect(body.data.user.email).toBe('updated@test.com')
      expect(body.data.user).not.toHaveProperty('passwordHash')
    })

    it('returns 404 if user not found', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('admin-1', 'admin')
      const res = await app.request('/api/users/nonexistent', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated' }),
      })
      expect(res.status).toBe(404)
    })

    it('returns 403 if trying to update another user (non-admin)', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('user-1', 'participant')
      const res = await app.request('/api/users/user-2', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Hacked' }),
      })
      expect(res.status).toBe(403)
    })

    it('allows admin to update any user including role', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('admin-1', 'admin')
      const res = await app.request('/api/users/user-1', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'New Name', role: 'host' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.user.name).toBe('New Name')
      expect(body.data.user.role).toBe('host')
    })

    it('returns 400 for invalid data', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('user-1', 'participant')
      const res = await app.request('/api/users/user-1', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'not-an-email' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 for empty body', async () => {
      const { app, db } = createApp()
      await seedUsers(db)
      const token = await createToken('user-1', 'participant')
      const res = await app.request('/api/users/user-1', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
    })
  })
})
