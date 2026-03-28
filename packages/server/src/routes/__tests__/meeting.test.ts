import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { eq } from 'drizzle-orm'
import { createTestDb } from '../../db/index.js'
import { createMeetingRoutes } from '../meeting.routes.js'
import { users, rooms, meetings, meetingParticipants } from '../../db/schema.js'

const JWT_SECRET = new TextEncoder().encode('dev-secret')

async function generateToken(role: string, userId: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .sign(JWT_SECRET)
}

describe('Meeting Routes', () => {
  let app: Hono
  let db: ReturnType<typeof createTestDb>
  let hostId: string
  let participantId: string
  let adminId: string
  let roomId: string
  let hostToken: string
  let participantToken: string
  let adminToken: string

  beforeEach(async () => {
    db = createTestDb()
    app = new Hono()
    app.route('/api/meetings', createMeetingRoutes(db))

    hostId = crypto.randomUUID()
    participantId = crypto.randomUUID()
    adminId = crypto.randomUUID()
    roomId = crypto.randomUUID()

    db.insert(users).values([
      { id: hostId, name: 'Host', email: 'host@test.com', passwordHash: 'hash', role: 'host' },
      { id: participantId, name: 'Participant', email: 'part@test.com', passwordHash: 'hash', role: 'participant' },
      { id: adminId, name: 'Admin', email: 'admin@test.com', passwordHash: 'hash', role: 'admin' },
    ]).run()

    db.insert(rooms).values({
      id: roomId, name: 'Room 1', location: 'Floor 1', capacity: 10,
    }).run()

    hostToken = await generateToken('host', hostId)
    participantToken = await generateToken('participant', participantId)
    adminToken = await generateToken('admin', adminId)
  })

  describe('GET /api/meetings', () => {
    it('returns empty array when no meetings', async () => {
      const res = await app.request('/api/meetings')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
    })

    it('returns list of meetings with participants', async () => {
      const m1 = crypto.randomUUID()
      const m2 = crypto.randomUUID()

      db.insert(meetings).values([
        { id: m1, title: 'M1', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z', roomId, hostId, status: 'scheduled', recurrence: 'none' },
        { id: m2, title: 'M2', startTime: '2024-01-15T11:00:00Z', endTime: '2024-01-15T12:00:00Z', roomId, hostId, status: 'scheduled', recurrence: 'none' },
      ]).run()

      db.insert(meetingParticipants).values([
        { meetingId: m1, userId: participantId, status: 'pending' },
        { meetingId: m2, userId: participantId, status: 'confirmed' },
      ]).run()

      const res = await app.request('/api/meetings')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(2)
      expect(body.data[0].participants).toBeDefined()
      expect(body.data[0].participants).toHaveLength(1)
    })

    it('supports filtering by status', async () => {
      db.insert(meetings).values([
        { id: crypto.randomUUID(), title: 'M1', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z', roomId, hostId, status: 'scheduled', recurrence: 'none' },
        { id: crypto.randomUUID(), title: 'M2', startTime: '2024-01-15T11:00:00Z', endTime: '2024-01-15T12:00:00Z', roomId, hostId, status: 'cancelled', recurrence: 'none' },
      ]).run()

      const res = await app.request('/api/meetings?status=scheduled')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0].status).toBe('scheduled')
    })

    it('supports pagination', async () => {
      for (let i = 0; i < 5; i++) {
        db.insert(meetings).values({
          id: crypto.randomUUID(),
          title: `M${i}`,
          startTime: `2024-01-${15 + i}T09:00:00Z`,
          endTime: `2024-01-${15 + i}T10:00:00Z`,
          roomId,
          hostId,
          status: 'scheduled',
          recurrence: 'none',
        }).run()
      }

      const res1 = await app.request('/api/meetings?page=1&limit=2')
      const body1 = await res1.json()
      expect(body1.data).toHaveLength(2)

      const res2 = await app.request('/api/meetings?page=2&limit=2')
      const body2 = await res2.json()
      expect(body2.data).toHaveLength(2)

      const res3 = await app.request('/api/meetings?page=3&limit=2')
      const body3 = await res3.json()
      expect(body3.data).toHaveLength(1)
    })
  })

  describe('GET /api/meetings/:id', () => {
    it('returns meeting detail with participants', async () => {
      const mid = crypto.randomUUID()
      db.insert(meetings).values({
        id: mid, title: 'Test', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z',
        roomId, hostId, status: 'scheduled', recurrence: 'none',
      }).run()
      db.insert(meetingParticipants).values({
        meetingId: mid, userId: participantId, status: 'pending',
      }).run()

      const res = await app.request(`/api/meetings/${mid}`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.id).toBe(mid)
      expect(body.data.title).toBe('Test')
      expect(body.data.participants).toHaveLength(1)
      expect(body.data.participants[0].userId).toBe(participantId)
    })

    it('returns 404 if not found', async () => {
      const res = await app.request(`/api/meetings/${crypto.randomUUID()}`)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/meetings', () => {
    it('successfully creates a meeting with valid data', async () => {
      const res = await app.request('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({
          title: 'New Meeting',
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T10:00:00Z',
          roomId,
          participantIds: [participantId],
        }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.data.title).toBe('New Meeting')
      expect(body.data.id).toBeDefined()
    })

    it('sets hostId to the authenticated user id', async () => {
      const res = await app.request('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({
          title: 'Host Test',
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T10:00:00Z',
          roomId,
          participantIds: [participantId],
        }),
      })
      const body = await res.json()
      expect(body.data.hostId).toBe(hostId)
    })

    it('creates meeting_participants entries for all participantIds', async () => {
      const p2 = crypto.randomUUID()
      db.insert(users).values({
        id: p2, name: 'Part2', email: 'part2@test.com', passwordHash: 'hash', role: 'participant',
      }).run()

      await app.request('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({
          title: 'Multi Part',
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T10:00:00Z',
          roomId,
          participantIds: [participantId, p2],
        }),
      })

      const parts = db.select().from(meetingParticipants).all()
      expect(parts).toHaveLength(2)
    })

    it('returns 409 if time conflict detected for the room', async () => {
      db.insert(meetings).values({
        id: crypto.randomUUID(), title: 'Existing', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z',
        roomId, hostId, status: 'scheduled', recurrence: 'none',
      }).run()

      const res = await app.request('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({
          title: 'Conflict',
          startTime: '2024-01-15T09:30:00Z',
          endTime: '2024-01-15T11:00:00Z',
          roomId,
          participantIds: [participantId],
        }),
      })
      expect(res.status).toBe(409)
    })

    it('returns 400 if endTime is before startTime', async () => {
      const res = await app.request('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({
          title: 'Bad Time',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T09:00:00Z',
          roomId,
          participantIds: [participantId],
        }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid data', async () => {
      const res = await app.request('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T10:00:00Z',
          roomId,
          participantIds: [participantId],
        }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 401 without auth token', async () => {
      const res = await app.request('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'No Auth',
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T10:00:00Z',
          roomId,
          participantIds: [participantId],
        }),
      })
      expect(res.status).toBe(401)
    })
  })

  describe('PUT /api/meetings/:id', () => {
    it('successfully updates a meeting', async () => {
      const mid = crypto.randomUUID()
      db.insert(meetings).values({
        id: mid, title: 'Original', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z',
        roomId, hostId, status: 'scheduled', recurrence: 'none',
      }).run()

      const res = await app.request(`/api/meetings/${mid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({ title: 'Updated' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.title).toBe('Updated')
    })

    it('returns 409 if updated time conflicts with another meeting', async () => {
      const m1 = crypto.randomUUID()
      const m2 = crypto.randomUUID()
      db.insert(meetings).values([
        { id: m1, title: 'M1', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z', roomId, hostId, status: 'scheduled', recurrence: 'none' },
        { id: m2, title: 'M2', startTime: '2024-01-15T11:00:00Z', endTime: '2024-01-15T12:00:00Z', roomId, hostId, status: 'scheduled', recurrence: 'none' },
      ]).run()

      const res = await app.request(`/api/meetings/${m2}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({ startTime: '2024-01-15T09:30:00Z', endTime: '2024-01-15T10:30:00Z' }),
      })
      expect(res.status).toBe(409)
    })

    it('returns 403 if user is not the host or admin', async () => {
      const mid = crypto.randomUUID()
      db.insert(meetings).values({
        id: mid, title: 'M', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z',
        roomId, hostId, status: 'scheduled', recurrence: 'none',
      }).run()

      const res = await app.request(`/api/meetings/${mid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${participantToken}` },
        body: JSON.stringify({ title: 'Hack' }),
      })
      expect(res.status).toBe(403)
    })

    it('returns 404 if meeting not found', async () => {
      const res = await app.request(`/api/meetings/${crypto.randomUUID()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hostToken}` },
        body: JSON.stringify({ title: 'Ghost' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/meetings/:id', () => {
    it('successfully cancels a meeting', async () => {
      const mid = crypto.randomUUID()
      db.insert(meetings).values({
        id: mid, title: 'Cancel', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z',
        roomId, hostId, status: 'scheduled', recurrence: 'none',
      }).run()

      const res = await app.request(`/api/meetings/${mid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${hostToken}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe('cancelled')

      const check = db.select().from(meetings).where(eq(meetings.id, mid)).get()
      expect(check).toBeDefined()
      expect(check!.status).toBe('cancelled')
    })

    it('returns 403 if not host or admin', async () => {
      const mid = crypto.randomUUID()
      db.insert(meetings).values({
        id: mid, title: 'M', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z',
        roomId, hostId, status: 'scheduled', recurrence: 'none',
      }).run()

      const res = await app.request(`/api/meetings/${mid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${participantToken}` },
      })
      expect(res.status).toBe(403)
    })

    it('returns 404 if not found', async () => {
      const res = await app.request(`/api/meetings/${crypto.randomUUID()}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${hostToken}` },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/meetings/:id/confirm', () => {
    it('successfully confirms attendance', async () => {
      const mid = crypto.randomUUID()
      db.insert(meetings).values({
        id: mid, title: 'Confirm', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z',
        roomId, hostId, status: 'scheduled', recurrence: 'none',
      }).run()
      db.insert(meetingParticipants).values({
        meetingId: mid, userId: participantId, status: 'pending',
      }).run()

      const res = await app.request(`/api/meetings/${mid}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${participantToken}` },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe('confirmed')
    })

    it('returns 404 if meeting not found', async () => {
      const res = await app.request(`/api/meetings/${crypto.randomUUID()}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${participantToken}` },
      })
      expect(res.status).toBe(404)
    })

    it('returns 403 if user is not a participant', async () => {
      const mid = crypto.randomUUID()
      db.insert(meetings).values({
        id: mid, title: 'Not Invited', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T10:00:00Z',
        roomId, hostId, status: 'scheduled', recurrence: 'none',
      }).run()

      const res = await app.request(`/api/meetings/${mid}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${participantToken}` },
      })
      expect(res.status).toBe(403)
    })
  })
})
