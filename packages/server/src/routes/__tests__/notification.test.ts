import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { eq } from 'drizzle-orm'
import { createTestDb } from '../../db/index.js'
import { createNotificationRoutes } from '../notification.routes.js'
import { meetings, notifications, rooms, users } from '../../db/schema.js'

const secret = new TextEncoder().encode('dev-secret')

async function createToken(userId: string, role: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .sign(secret)
}

describe('Notification Routes', () => {
  let app: Hono
  let db: ReturnType<typeof createTestDb>
  let userToken: string

  beforeEach(async () => {
    db = createTestDb()
    app = new Hono()
    app.route('/api/notifications', createNotificationRoutes(db))

    db.insert(users).values([
      {
        id: 'user-1',
        name: 'User One',
        email: 'user1@test.com',
        passwordHash: 'hash',
        role: 'participant',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-1',
        name: 'Host',
        email: 'host@test.com',
        passwordHash: 'hash',
        role: 'host',
        createdAt: new Date().toISOString(),
      },
    ]).run()

    db.insert(rooms).values({
      id: 'room-1',
      name: 'Room 1',
      capacity: 10,
      createdAt: new Date().toISOString(),
    }).run()

    db.insert(meetings).values({
      id: 'meeting-1',
      title: 'Team Sync',
      startTime: '2026-03-28T09:00:00.000Z',
      endTime: '2026-03-28T10:00:00.000Z',
      roomId: 'room-1',
      hostId: 'host-1',
      recurrence: 'none',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run()

    db.insert(notifications).values([
      {
        id: 'notification-1',
        userId: 'user-1',
        meetingId: 'meeting-1',
        type: 'change',
        message: 'Meeting updated',
        read: false,
        createdAt: new Date('2026-03-28T08:00:00.000Z').toISOString(),
      },
      {
        id: 'notification-2',
        userId: 'user-1',
        meetingId: 'meeting-1',
        type: 'reminder',
        message: 'Meeting starts soon',
        read: true,
        createdAt: new Date('2026-03-28T08:30:00.000Z').toISOString(),
      },
    ]).run()

    userToken = await createToken('user-1', 'participant')
  })

  it('lists notifications for the current user with pagination', async () => {
    const res = await app.request('/api/notifications?page=1&limit=1', {
      headers: { Authorization: `Bearer ${userToken}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination).toEqual({ page: 1, limit: 1, total: 2 })
  })

  it('filters unread notifications', async () => {
    const res = await app.request('/api/notifications?read=false', {
      headers: { Authorization: `Bearer ${userToken}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('notification-1')
  })

  it('marks a notification as read', async () => {
    const res = await app.request('/api/notifications/notification-1/read', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userToken}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.read).toBe(true)

    const stored = db.select().from(notifications).where(eq(notifications.id, 'notification-1')).get()
    expect(stored?.read).toBe(true)
  })
})
