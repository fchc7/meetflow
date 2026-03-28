import crypto from 'node:crypto'
import { Hono } from 'hono'
import { and, asc, count, eq, gte, lt, ne, type SQL } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { z } from 'zod'
import { createMeetingSchema, hasTimeConflict } from '@meetflow/shared'
import * as schema from '../db/schema.js'
import { meetings, meetingParticipants, rooms, users } from '../db/schema.js'
import { db } from '../db/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { createMeetingNotifications } from '../services/notification.service.js'
import { generateRecurringOccurrences } from '../services/recurrence.js'

type Env = { Variables: { userId: string; userRole: string } }

const updateBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  agenda: z.string().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  roomId: z.string().uuid().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  recurrenceEndsAt: z.string().datetime().optional().nullable(),
  participantIds: z.array(z.string().uuid()).optional(),
})

function normalizePagination(value: string | undefined, fallback: number) {
  const parsed = Number(value || fallback)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.floor(parsed)
}

function getDayRange(date: string) {
  return {
    start: `${date}T00:00:00.000Z`,
    end: `${date}T23:59:59.999Z`,
  }
}

function createMeetingWhereClause(input: { status?: string; date?: string }) {
  const conditions: SQL[] = []

  if (input.status) {
    conditions.push(eq(meetings.status, input.status as 'scheduled' | 'cancelled' | 'completed'))
  }

  if (input.date) {
    const range = getDayRange(input.date)
    conditions.push(gte(meetings.startTime, range.start))
    conditions.push(lt(meetings.startTime, range.end))
  }

  if (conditions.length === 0) {
    return undefined
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions)
}

function getParticipants(targetDb: BetterSQLite3Database<typeof schema>, meetingId: string) {
  return targetDb.select()
    .from(meetingParticipants)
    .where(eq(meetingParticipants.meetingId, meetingId))
    .all()
}

function getParticipantProfiles(targetDb: BetterSQLite3Database<typeof schema>, meetingId: string) {
  return targetDb.select({
    userId: meetingParticipants.userId,
    status: meetingParticipants.status,
    name: users.name,
    email: users.email,
  })
    .from(meetingParticipants)
    .leftJoin(users, eq(meetingParticipants.userId, users.id))
    .where(eq(meetingParticipants.meetingId, meetingId))
    .all()
    .map((participant) => ({
      userId: participant.userId,
      status: participant.status,
      name: participant.name ?? undefined,
      email: participant.email ?? undefined,
    }))
}

function getMeetingDetail(targetDb: BetterSQLite3Database<typeof schema>, meetingId: string) {
  const meeting = targetDb.select().from(meetings).where(eq(meetings.id, meetingId)).get()
  if (!meeting) {
    return null
  }

  const room = targetDb.select().from(rooms).where(eq(rooms.id, meeting.roomId)).get()

  return {
    ...meeting,
    room: room ?? undefined,
    participants: getParticipantProfiles(targetDb, meetingId),
  }
}

function getRoomSchedule(
  targetDb: BetterSQLite3Database<typeof schema>,
  roomId: string,
  excludeMeetingId?: string,
) {
  const conditions: SQL[] = [
    eq(meetings.roomId, roomId),
    eq(meetings.status, 'scheduled'),
  ]

  if (excludeMeetingId) {
    conditions.push(ne(meetings.id, excludeMeetingId))
  }

  return targetDb.select({
    start: meetings.startTime,
    end: meetings.endTime,
  })
    .from(meetings)
    .where(and(...conditions))
    .all()
}

function hasAnyConflict(
  existing: Array<{ start: string; end: string }>,
  occurrences: Array<{ startTime: string; endTime: string }>,
) {
  return occurrences.some((occurrence) => hasTimeConflict(existing, {
    start: occurrence.startTime,
    end: occurrence.endTime,
  }))
}

export function createMeetingRoutes(targetDb: BetterSQLite3Database<typeof schema>) {
  const router = new Hono<Env>()

  router.get('/', (c) => {
    const status = c.req.query('status')
    const date = c.req.query('date')
    const page = normalizePagination(c.req.query('page'), 1)
    const limit = normalizePagination(c.req.query('limit'), 20)
    const offset = (page - 1) * limit
    const where = createMeetingWhereClause({ status, date })

    const result = targetDb.select()
      .from(meetings)
      .where(where)
      .orderBy(asc(meetings.startTime))
      .limit(limit)
      .offset(offset)
      .all()

    const total = targetDb.select({ value: count() })
      .from(meetings)
      .where(where)
      .get()?.value ?? 0

    const data = result.map((meeting) => ({
      ...meeting,
      participants: getParticipants(targetDb, meeting.id),
    }))

    return c.json({ data, pagination: { page, limit, total } })
  })

  router.get('/:id', (c) => {
    const id = c.req.param('id')
    const meeting = getMeetingDetail(targetDb, id)

    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    return c.json({ data: meeting })
  })

  router.post('/', authMiddleware, async (c) => {
    const userId = c.get('userId')

    const body = await c.req.json()
    const parsed = createMeetingSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: parsed.error.issues }, 400)
    }

    const { participantIds, ...meetingData } = parsed.data
    const normalizedStartTime = new Date(meetingData.startTime).toISOString()
    const normalizedEndTime = new Date(meetingData.endTime).toISOString()

    if (new Date(normalizedEndTime) <= new Date(normalizedStartTime)) {
      return c.json({ error: 'endTime must be after startTime' }, 400)
    }

    if (
      meetingData.recurrence !== 'none'
      && meetingData.recurrenceEndsAt
      && new Date(meetingData.recurrenceEndsAt) < new Date(normalizedStartTime)
    ) {
      return c.json({ error: 'recurrenceEndsAt must be on or after startTime' }, 400)
    }

    const recurring = generateRecurringOccurrences({
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      recurrence: meetingData.recurrence,
      recurrenceEndsAt: meetingData.recurrenceEndsAt,
    })

    const occurrences = [
      { startTime: normalizedStartTime, endTime: normalizedEndTime },
      ...recurring.occurrences,
    ]

    if (hasAnyConflict(getRoomSchedule(targetDb, meetingData.roomId), occurrences)) {
      return c.json({ error: 'Time conflict detected' }, 409)
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    targetDb.transaction((tx) => {
      const seriesId = meetingData.recurrence === 'none' ? null : id
      const recurrenceEndsAt = recurring.recurrenceEndsAt

      for (const [index, occurrence] of occurrences.entries()) {
        const meetingId = index === 0 ? id : crypto.randomUUID()

        tx.insert(meetings).values({
          id: meetingId,
          title: meetingData.title,
          description: meetingData.description ?? null,
          agenda: meetingData.agenda ?? null,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          roomId: meetingData.roomId,
          hostId: userId,
          recurrence: meetingData.recurrence,
          recurrenceEndsAt,
          seriesId,
          status: 'scheduled',
          createdAt: now,
          updatedAt: now,
        }).run()

        if (participantIds.length > 0) {
          tx.insert(meetingParticipants).values(
            participantIds.map((participantId: string) => ({
              meetingId,
              userId: participantId,
              status: 'pending' as const,
            })),
          ).run()
        }
      }
    })

    const meeting = targetDb.select().from(meetings).where(eq(meetings.id, id)).get()!
    return c.json({
      data: {
        ...meeting,
        participants: getParticipants(targetDb, id),
      },
    }, 201)
  })

  router.put('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const userRole = c.get('userRole')
    const id = c.req.param('id')

    const meeting = targetDb.select().from(meetings).where(eq(meetings.id, id)).get()
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    if (meeting.hostId !== userId && userRole !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const body = await c.req.json()
    const parsed = updateBody.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: parsed.error.issues }, 400)
    }

    const payload = parsed.data
    const newStartTime = payload.startTime ? new Date(payload.startTime).toISOString() : meeting.startTime
    const newEndTime = payload.endTime ? new Date(payload.endTime).toISOString() : meeting.endTime
    const newRoomId = payload.roomId ?? meeting.roomId
    const newRecurrence = payload.recurrence ?? meeting.recurrence
    const newRecurrenceEndsAt = payload.recurrenceEndsAt === undefined
      ? meeting.recurrenceEndsAt
      : payload.recurrenceEndsAt

    if (new Date(newEndTime) <= new Date(newStartTime)) {
      return c.json({ error: 'endTime must be after startTime' }, 400)
    }

    if (
      newRecurrence !== 'none'
      && newRecurrenceEndsAt
      && new Date(newRecurrenceEndsAt) < new Date(newStartTime)
    ) {
      return c.json({ error: 'recurrenceEndsAt must be on or after startTime' }, 400)
    }

    if (hasTimeConflict(getRoomSchedule(targetDb, newRoomId, id), { start: newStartTime, end: newEndTime })) {
      return c.json({ error: 'Time conflict detected' }, 409)
    }

    const now = new Date().toISOString()
    targetDb.transaction((tx) => {
      tx.update(meetings).set({
        title: payload.title ?? meeting.title,
        description: payload.description ?? meeting.description,
        agenda: payload.agenda ?? meeting.agenda,
        startTime: newStartTime,
        endTime: newEndTime,
        roomId: newRoomId,
        recurrence: newRecurrence,
        recurrenceEndsAt: newRecurrence === 'none' ? null : (newRecurrenceEndsAt ?? null),
        updatedAt: now,
      }).where(eq(meetings.id, id)).run()

      if (payload.participantIds) {
        tx.delete(meetingParticipants)
          .where(eq(meetingParticipants.meetingId, id))
          .run()

        if (payload.participantIds.length > 0) {
          tx.insert(meetingParticipants).values(
            payload.participantIds.map((participantId: string) => ({
              meetingId: id,
              userId: participantId,
              status: 'pending' as const,
            })),
          ).run()
        }
      }
    })

    const updated = targetDb.select().from(meetings).where(eq(meetings.id, id)).get()!
    createMeetingNotifications(targetDb, id, 'change', `Meeting "${updated.title}" was updated.`)

    return c.json({
      data: {
        ...updated,
        participants: getParticipants(targetDb, id),
      },
    })
  })

  router.delete('/:id', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const userRole = c.get('userRole')
    const id = c.req.param('id')

    const meeting = targetDb.select().from(meetings).where(eq(meetings.id, id)).get()
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    if (meeting.hostId !== userId && userRole !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const now = new Date().toISOString()
    targetDb.update(meetings)
      .set({ status: 'cancelled', updatedAt: now })
      .where(eq(meetings.id, id))
      .run()

    const updated = targetDb.select().from(meetings).where(eq(meetings.id, id)).get()!
    createMeetingNotifications(targetDb, id, 'cancel', `Meeting "${updated.title}" was cancelled.`)

    return c.json({ data: updated })
  })

  router.post('/:id/confirm', authMiddleware, async (c) => {
    const userId = c.get('userId')
    const id = c.req.param('id')

    const meeting = targetDb.select().from(meetings).where(eq(meetings.id, id)).get()
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    const participant = targetDb.select()
      .from(meetingParticipants)
      .where(and(
        eq(meetingParticipants.meetingId, id),
        eq(meetingParticipants.userId, userId),
      ))
      .get()

    if (!participant) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    targetDb.update(meetingParticipants)
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
