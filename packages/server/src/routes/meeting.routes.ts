import { Hono } from 'hono'
import { eq, and, ne } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { z } from 'zod'
import { hasTimeConflict } from '@meetflow/shared'
import * as schema from '../db/schema.js'
import { meetings, meetingParticipants } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { db } from '../db/index.js'

type Env = { Variables: { userId: string; userRole: string } }

const createBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  agenda: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  roomId: z.string().min(1),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  participantIds: z.array(z.string()).min(1),
})

export function createMeetingRoutes(db: BetterSQLite3Database<typeof schema>) {
  const router = new Hono<Env>()

  router.get('/', (c) => {
    const status = c.req.query('status')
    const page = Number(c.req.query('page') || 1)
    const limit = Number(c.req.query('limit') || 20)
    const offset = (page - 1) * limit

    const conditions = []
    if (status) conditions.push(eq(meetings.status, status as 'scheduled' | 'cancelled' | 'completed'))

    const result = db.select().from(meetings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .all()

    const data = result.map((m) => {
      const participants = db.select()
        .from(meetingParticipants)
        .where(eq(meetingParticipants.meetingId, m.id))
        .all()
      return { ...m, participants }
    })

    return c.json({ data })
  })

  router.get('/:id', (c) => {
    const id = c.req.param('id')
    const meeting = db.select().from(meetings).where(eq(meetings.id, id)).get()

    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    const participants = db.select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, id))
      .all()

    return c.json({ data: { ...meeting, participants } })
  })

  router.post('/', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const userRole = c.get('userRole')

    if (userRole !== 'host' && userRole !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const body = await c.req.json()
    const parsed = createBody.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: parsed.error.issues }, 400)
    }

    const { participantIds, ...meetingData } = parsed.data

    if (new Date(meetingData.endTime) <= new Date(meetingData.startTime)) {
      return c.json({ error: 'endTime must be after startTime' }, 400)
    }

    const existing = db.select({
      start: meetings.startTime,
      end: meetings.endTime,
    })
      .from(meetings)
      .where(and(
        eq(meetings.roomId, meetingData.roomId),
        eq(meetings.status, 'scheduled'),
      ))
      .all()

    if (hasTimeConflict(existing, { start: meetingData.startTime, end: meetingData.endTime })) {
      return c.json({ error: 'Time conflict detected' }, 409)
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    db.insert(meetings).values({
      id,
      title: meetingData.title,
      description: meetingData.description ?? null,
      agenda: meetingData.agenda ?? null,
      startTime: meetingData.startTime,
      endTime: meetingData.endTime,
      roomId: meetingData.roomId,
      hostId: userId,
      recurrence: meetingData.recurrence,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    }).run()

    for (const pId of participantIds) {
      db.insert(meetingParticipants).values({
        meetingId: id,
        userId: pId,
        status: 'pending',
      }).run()
    }

    const meeting = db.select().from(meetings).where(eq(meetings.id, id)).get()!
    const participants = db.select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, id))
      .all()

    return c.json({ data: { ...meeting, participants } }, 201)
  })

  router.put('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const userRole = c.get('userRole')
    const id = c.req.param('id')

    const meeting = db.select().from(meetings).where(eq(meetings.id, id)).get()
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    if (meeting.hostId !== userId && userRole !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const body = await c.req.json()
    const newStartTime = body.startTime ?? meeting.startTime
    const newEndTime = body.endTime ?? meeting.endTime
    const newRoomId = body.roomId ?? meeting.roomId

    if (new Date(newEndTime) <= new Date(newStartTime)) {
      return c.json({ error: 'endTime must be after startTime' }, 400)
    }

    const existing = db.select({
      start: meetings.startTime,
      end: meetings.endTime,
    })
      .from(meetings)
      .where(and(
        eq(meetings.roomId, newRoomId),
        eq(meetings.status, 'scheduled'),
        ne(meetings.id, id),
      ))
      .all()

    if (hasTimeConflict(existing, { start: newStartTime, end: newEndTime })) {
      return c.json({ error: 'Time conflict detected' }, 409)
    }

    const now = new Date().toISOString()
    db.update(meetings).set({
      title: body.title ?? meeting.title,
      description: body.description ?? meeting.description,
      agenda: body.agenda ?? meeting.agenda,
      startTime: newStartTime,
      endTime: newEndTime,
      roomId: newRoomId,
      recurrence: body.recurrence ?? meeting.recurrence,
      updatedAt: now,
    }).where(eq(meetings.id, id)).run()

    const updated = db.select().from(meetings).where(eq(meetings.id, id)).get()!
    const participants = db.select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, id))
      .all()

    return c.json({ data: { ...updated, participants } })
  })

  router.delete('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const userRole = c.get('userRole')
    const id = c.req.param('id')

    const meeting = db.select().from(meetings).where(eq(meetings.id, id)).get()
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    if (meeting.hostId !== userId && userRole !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const now = new Date().toISOString()
    db.update(meetings)
      .set({ status: 'cancelled', updatedAt: now })
      .where(eq(meetings.id, id))
      .run()

    const updated = db.select().from(meetings).where(eq(meetings.id, id)).get()!

    return c.json({ data: updated })
  })

  router.post('/:id/confirm', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const id = c.req.param('id')

    const meeting = db.select().from(meetings).where(eq(meetings.id, id)).get()
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    const participant = db.select()
      .from(meetingParticipants)
      .where(and(
        eq(meetingParticipants.meetingId, id),
        eq(meetingParticipants.userId, userId),
      ))
      .get()

    if (!participant) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    db.update(meetingParticipants)
      .set({ status: 'confirmed' })
      .where(and(
        eq(meetingParticipants.meetingId, id),
        eq(meetingParticipants.userId, userId),
      ))
      .run()

    return c.json({ data: { meetingId: id, userId, status: 'confirmed' } })
  })

  return router
}

export const meetingRoutes = createMeetingRoutes(db)
