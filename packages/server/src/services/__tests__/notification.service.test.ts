import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from '../../db/index.js'
import { meetings, meetingParticipants, notifications, rooms, users } from '../../db/schema.js'
import { processReminderNotifications } from '../notification.service.js'

describe('notification service', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()

    db.insert(users).values([
      {
        id: 'host-1',
        name: 'Host User',
        email: 'host@test.com',
        passwordHash: 'hash',
        role: 'host',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'participant-1',
        name: 'Participant User',
        email: 'participant@test.com',
        passwordHash: 'hash',
        role: 'participant',
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
      title: 'Reminder Meeting',
      startTime: '2026-03-28T10:15:00.000Z',
      endTime: '2026-03-28T11:00:00.000Z',
      roomId: 'room-1',
      hostId: 'host-1',
      recurrence: 'none',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run()

    db.insert(meetingParticipants).values({
      meetingId: 'meeting-1',
      userId: 'participant-1',
      status: 'pending',
    }).run()
  })

  it('creates reminder notifications for upcoming meetings only once', () => {
    const processedFirst = processReminderNotifications(db, new Date('2026-03-28T09:30:00.000Z'))
    const processedSecond = processReminderNotifications(db, new Date('2026-03-28T09:35:00.000Z'))

    expect(processedFirst).toBe(1)
    expect(processedSecond).toBe(0)

    const createdNotifications = db.select().from(notifications).all()
    expect(createdNotifications).toHaveLength(1)
    expect(createdNotifications[0].type).toBe('reminder')
  })
})
