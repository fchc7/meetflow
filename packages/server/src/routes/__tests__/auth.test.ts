import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { createTestDb } from '../../db/index.js'
import { createAuthRoutes } from '../auth.routes.js'
import { authMiddleware } from '../../middleware/auth.js'

describe('POST /register', () => {
  let app: Hono

  beforeEach(() => {
    const db = createTestDb()
    app = new Hono()
    app.route('/', createAuthRoutes(db))
  })

  it('should register a new user with valid data', async () => {
    const res = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.data.user).toBeDefined()
    expect(body.data.user.name).toBe('Test User')
    expect(body.data.user.email).toBe('test@example.com')
    expect(body.data.user).not.toHaveProperty('passwordHash')
    expect(body.data.token).toBeDefined()
    expect(typeof body.data.token).toBe('string')
  })

  it('should return 400 if email is missing', async () => {
    const res = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', password: 'password123' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('should return 400 if password is missing', async () => {
    const res = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
    })
    expect(res.status).toBe(400)
  })

  it('should return 400 if password is too short (< 6 chars)', async () => {
    const res = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: '12345' }),
    })
    expect(res.status).toBe(400)
  })

  it('should return 400 if name is missing', async () => {
    const res = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('should return 409 if email already exists', async () => {
    await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const res = await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: 'test@example.com',
        password: 'password456',
      }),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Email already registered')
  })
})

describe('POST /login', () => {
  let app: Hono

  beforeEach(async () => {
    const db = createTestDb()
    app = new Hono()
    app.route('/', createAuthRoutes(db))

    await app.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }),
    })
  })

  it('should login with correct credentials and return JWT token', async () => {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.data.user).toBeDefined()
    expect(body.data.user.email).toBe('test@example.com')
    expect(body.data.user).not.toHaveProperty('passwordHash')
    expect(body.data.token).toBeDefined()
    expect(typeof body.data.token).toBe('string')
  })

  it('should return 401 if email does not exist', async () => {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noone@example.com', password: 'password123' }),
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid credentials')
  })

  it('should return 401 if password is wrong', async () => {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid credentials')
  })

  it('should return 400 if email is missing', async () => {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123' }),
    })
    expect(res.status).toBe(400)
  })

  it('should return 400 if password is missing', async () => {
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('Auth Middleware', () => {
  const secret = new TextEncoder().encode('dev-secret')

  it('should allow access with valid JWT token', async () => {
    const token = await new SignJWT({ role: 'participant' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-id-123')
      .sign(secret)

    const testApp = new Hono<{ Variables: { userId: string; userRole: string } }>()
    testApp.use('/protected', authMiddleware)
    testApp.get('/protected', (c) => c.json({ userId: c.get('userId') }))

    const res = await testApp.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('user-id-123')
  })

  it('should return 401 without token', async () => {
    const testApp = new Hono()
    testApp.use('/protected', authMiddleware)
    testApp.get('/protected', (c) => c.json({ ok: true }))

    const res = await testApp.request('/protected')
    expect(res.status).toBe(401)
  })

  it('should return 401 with invalid token', async () => {
    const testApp = new Hono()
    testApp.use('/protected', authMiddleware)
    testApp.get('/protected', (c) => c.json({ ok: true }))

    const res = await testApp.request('/protected', {
      headers: { Authorization: 'Bearer invalid-token-here' },
    })
    expect(res.status).toBe(401)
  })
})
