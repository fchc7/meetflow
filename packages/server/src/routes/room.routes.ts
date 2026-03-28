import crypto from 'node:crypto'
import { Hono } from 'hono'
import { eq, and, gte, lt, count } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema.js'
import { rooms, meetings } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { db } from '../db/index.js'

export function createRoomRoutes(db: BetterSQLite3Database<typeof schema>) {
  const router = new Hono()

  router.get('/', (c) => {
    const page = Math.max(Number(c.req.query('page') || 1), 1)
    const limit = Math.max(Number(c.req.query('limit') || 20), 1)
    const offset = (page - 1) * limit
    const available = c.req.query('available') === 'true'
    const date = c.req.query('date')

    let result = db.select().from(rooms).all()

    if (available && date) {
      const dayStart = `${date}T00:00:00.000Z`
      const dayEnd = `${date}T23:59:59.999Z`
      const busyRoomIds = new Set(
        db.select({ roomId: meetings.roomId })
          .from(meetings)
          .where(and(
            gte(meetings.startTime, dayStart),
            lt(meetings.startTime, dayEnd),
            eq(meetings.status, 'scheduled'),
          ))
          .all()
          .map((meeting) => meeting.roomId),
      )

      result = result.filter((room) => !busyRoomIds.has(room.id))
    }

    const total = result.length
    result = result.slice(offset, offset + limit)

    return c.json({ data: result, pagination: { page, limit, total } })
  })

  router.get('/:id', (c) => {
    const id = c.req.param('id')
    const room = db.select().from(rooms).where(eq(rooms.id, id)).get()

    if (!room) {
      return c.json({ error: 'Room not found' }, 404)
    }

    return c.json({ data: room })
  })

  router.post('/', authMiddleware, async (c) => {
    const body = await c.req.json()

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return c.json({ error: 'Name is required' }, 400)
    }

    if (body.capacity === undefined || body.capacity === null || typeof body.capacity !== 'number' || body.capacity <= 0) {
      return c.json({ error: 'Capacity must be a positive number' }, 400)
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    db.insert(rooms).values({
      id,
      name: body.name,
      location: body.location ?? null,
      capacity: body.capacity,
      equipment: body.equipment ?? [],
      createdAt: now,
    }).run()

    const room = db.select().from(rooms).where(eq(rooms.id, id)).get()
    return c.json({ data: room }, 201)
  })

  router.get('/:id/availability', (c) => {
    const id = c.req.param('id')
    const date = c.req.query('date')

    const room = db.select().from(rooms).where(eq(rooms.id, id)).get()
    if (!room) {
      return c.json({ error: 'Room not found' }, 404)
    }

    const dayStart = `${date}T00:00:00.000Z`
    const dayEnd = `${date}T23:59:59.999Z`

    const dayMeetings = db.select({
      startTime: meetings.startTime,
      endTime: meetings.endTime,
    }).from(meetings).where(
      and(
        eq(meetings.roomId, id),
        gte(meetings.startTime, dayStart),
        lt(meetings.startTime, dayEnd),
        eq(meetings.status, 'scheduled'),
      )
    ).all()

    const bookedSlots = dayMeetings.map((m) => ({
      start: m.startTime,
      end: m.endTime,
    }))

    return c.json({ data: { roomId: id, date: date!, bookedSlots } })
  })

  return router
}

export const roomRoutes = createRoomRoutes(db)
