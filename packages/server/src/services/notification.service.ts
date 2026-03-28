import crypto from 'node:crypto'
import { and, eq, gte, lte, type SQL, count } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema.js'

type Db = BetterSQLite3Database<typeof schema>

function getMeetingParticipantIds(db: Db, meetingId: string) {
  return db.select({ userId: schema.meetingParticipants.userId })
    .from(schema.meetingParticipants)
    .where(eq(schema.meetingParticipants.meetingId, meetingId))
    .all()
    .map((participant) => participant.userId)
}

export function createMeetingNotifications(
  db: Db,
  meetingId: string,
  type: 'change' | 'cancel',
  message: string,
) {
  const participantIds = getMeetingParticipantIds(db, meetingId)
  if (participantIds.length === 0) {
    return []
  }

  const createdAt = new Date().toISOString()
  const rows = participantIds.map((userId) => ({
    id: crypto.randomUUID(),
    userId,
    meetingId,
    type,
    message,
    read: false,
    createdAt,
  }))

  db.insert(schema.notifications).values(rows).run()
  return rows
}

export function processReminderNotifications(db: Db, now = new Date()) {
  const windowEnd = new Date(now)
  windowEnd.setUTCHours(windowEnd.getUTCHours() + 1)

  const upcomingMeetings = db.select()
    .from(schema.meetings)
    .where(and(
      eq(schema.meetings.status, 'scheduled'),
      gte(schema.meetings.startTime, now.toISOString()),
      lte(schema.meetings.startTime, windowEnd.toISOString()),
    ))
    .all()

  let created = 0

  for (const meeting of upcomingMeetings) {
    for (const userId of getMeetingParticipantIds(db, meeting.id)) {
      const existing = db.select()
        .from(schema.notifications)
        .where(and(
          eq(schema.notifications.meetingId, meeting.id),
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.type, 'reminder'),
        ))
        .get()

      if (existing) {
        continue
      }

      db.insert(schema.notifications).values({
        id: crypto.randomUUID(),
        userId,
        meetingId: meeting.id,
        type: 'reminder',
        message: `Reminder: "${meeting.title}" starts at ${meeting.startTime}`,
        read: false,
        createdAt: now.toISOString(),
      }).run()
      created += 1
    }
  }

  return created
}

export function listNotifications(db: Db, userId: string, input: { page: number; limit: number; read?: boolean }) {
  const conditions: SQL[] = [eq(schema.notifications.userId, userId)]
  if (input.read !== undefined) {
    conditions.push(eq(schema.notifications.read, input.read))
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0]
  const offset = (input.page - 1) * input.limit

  const data = db.select()
    .from(schema.notifications)
    .where(where)
    .orderBy(schema.notifications.createdAt)
    .limit(input.limit)
    .offset(offset)
    .all()
    .reverse()

  const total = db.select({ value: count() })
    .from(schema.notifications)
    .where(where)
    .get()?.value ?? 0

  return {
    data,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
    },
  }
}

export function markNotificationAsRead(db: Db, userId: string, notificationId: string) {
  const notification = db.select()
    .from(schema.notifications)
    .where(and(
      eq(schema.notifications.id, notificationId),
      eq(schema.notifications.userId, userId),
    ))
    .get()

  if (!notification) {
    return null
  }

  db.update(schema.notifications)
    .set({ read: true })
    .where(eq(schema.notifications.id, notificationId))
    .run()

  return db.select().from(schema.notifications).where(eq(schema.notifications.id, notificationId)).get() ?? null
}
