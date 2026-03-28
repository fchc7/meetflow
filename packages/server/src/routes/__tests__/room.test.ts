import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { createTestDb } from '../../db/index.js'
import { createRoomRoutes } from '../room.routes.js'
import { rooms, users, meetings } from '../../db/schema.js'

const JWT_SECRET = new TextEncoder().encode('dev-secret')

async function generateToken(role = 'admin', userId = 'test-user-id') {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .sign(JWT_SECRET)
}

describe('Room Routes', () => {
  let app: Hono
  let db: ReturnType<typeof createTestDb>
  let token: string

  beforeEach(async () => {
    db = createTestDb()
    app = new Hono()
    app.route('/api/rooms', createRoomRoutes(db))
    token = await generateToken()
  })

  describe('GET /', () => {
    it('returns empty array when no rooms exist', async () => {
      const res = await app.request('/api/rooms')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
      expect(body.pagination.total).toBe(0)
    })

    it('returns list of rooms', async () => {
      db.insert(rooms).values({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
        equipment: ['projector', 'whiteboard'],
        createdAt: new Date().toISOString(),
      }).run()

      const res = await app.request('/api/rooms')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0].name).toBe('Conference Room A')
      expect(body.data[0].capacity).toBe(10)
      expect(body.data[0].location).toBe('Floor 1')
      expect(body.data[0].equipment).toEqual(['projector', 'whiteboard'])
    })

    it('supports pagination', async () => {
      for (let i = 0; i < 25; i++) {
        db.insert(rooms).values({
          id: `room-${i}`,
          name: `Room ${i}`,
          capacity: 10,
          createdAt: new Date().toISOString(),
        }).run()
      }

      const res = await app.request('/api/rooms?page=1&limit=10')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(10)
      expect(body.pagination).toEqual({ page: 1, limit: 10, total: 25 })

      const res2 = await app.request('/api/rooms?page=3&limit=10')
      const body2 = await res2.json()
      expect(body2.data).toHaveLength(5)
      expect(body2.pagination.page).toBe(3)
      expect(body2.pagination.total).toBe(25)
    })
  })

  describe('GET /:id', () => {
    it('returns room by id', async () => {
      db.insert(rooms).values({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        createdAt: new Date().toISOString(),
      }).run()

      const res = await app.request('/api/rooms/room-1')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.id).toBe('room-1')
      expect(body.data.name).toBe('Conference Room A')
      expect(body.data.capacity).toBe(10)
    })

    it('returns 404 if room not found', async () => {
      const res = await app.request('/api/rooms/nonexistent')
      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })
  })

  describe('POST /', () => {
    it('successfully creates a room', async () => {
      const res = await app.request('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'New Room',
          capacity: 20,
          location: 'Floor 2',
          equipment: ['projector'],
        }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.data.name).toBe('New Room')
      expect(body.data.capacity).toBe(20)
      expect(body.data.location).toBe('Floor 2')
      expect(body.data.equipment).toEqual(['projector'])
      expect(body.data.id).toBeDefined()
    })

    it('creates a room with only required fields', async () => {
      const res = await app.request('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Minimal Room', capacity: 5 }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.data.name).toBe('Minimal Room')
      expect(body.data.capacity).toBe(5)
    })

    it('returns 400 if name is missing', async () => {
      const res = await app.request('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ capacity: 20 }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })

    it('returns 400 if capacity is missing', async () => {
      const res = await app.request('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Room' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 if capacity is not positive', async () => {
      const res = await app.request('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Room', capacity: 0 }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Room', capacity: 10 }),
      })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /:id/availability', () => {
    it('returns booked time slots for a room on a given date', async () => {
      db.insert(rooms).values({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        createdAt: new Date().toISOString(),
      }).run()

      db.insert(users).values({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'admin',
        createdAt: new Date().toISOString(),
      }).run()

      db.insert(meetings).values({
        id: 'meeting-1',
        title: 'Team Standup',
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T10:00:00.000Z',
        roomId: 'room-1',
        hostId: 'user-1',
        status: 'scheduled',
        recurrence: 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run()

      const res = await app.request('/api/rooms/room-1/availability?date=2024-01-15')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.roomId).toBe('room-1')
      expect(body.data.date).toBe('2024-01-15')
      expect(body.data.bookedSlots).toHaveLength(1)
      expect(body.data.bookedSlots[0]).toEqual({
        start: '2024-01-15T09:00:00.000Z',
        end: '2024-01-15T10:00:00.000Z',
      })
    })

    it('returns empty booked slots when no meetings exist', async () => {
      db.insert(rooms).values({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        createdAt: new Date().toISOString(),
      }).run()

      const res = await app.request('/api/rooms/room-1/availability?date=2024-01-15')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.bookedSlots).toEqual([])
    })

    it('returns 404 if room not found', async () => {
      const res = await app.request('/api/rooms/nonexistent/availability?date=2024-01-15')
      expect(res.status).toBe(404)
    })

    it('only returns meetings on the specified date', async () => {
      db.insert(rooms).values({
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        createdAt: new Date().toISOString(),
      }).run()

      db.insert(users).values({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'admin',
        createdAt: new Date().toISOString(),
      }).run()

      db.insert(meetings).values({
        id: 'meeting-1',
        title: 'Monday Meeting',
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T10:00:00.000Z',
        roomId: 'room-1',
        hostId: 'user-1',
        status: 'scheduled',
        recurrence: 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run()

      db.insert(meetings).values({
        id: 'meeting-2',
        title: 'Tuesday Meeting',
        startTime: '2024-01-16T09:00:00.000Z',
        endTime: '2024-01-16T10:00:00.000Z',
        roomId: 'room-1',
        hostId: 'user-1',
        status: 'scheduled',
        recurrence: 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).run()

      const res = await app.request('/api/rooms/room-1/availability?date=2024-01-15')
      const body = await res.json()
      expect(body.data.bookedSlots).toHaveLength(1)
      expect(body.data.bookedSlots[0].start).toBe('2024-01-15T09:00:00.000Z')
    })
  })
})
