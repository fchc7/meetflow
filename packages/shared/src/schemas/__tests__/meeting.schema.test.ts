import { describe, expect, it } from 'vitest'
import { createMeetingSchema, meetingSchema } from '../meeting.schema.js'

const validMeeting = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Sprint Planning',
  description: 'Weekly sprint planning',
  agenda: 'Review backlog',
  startTime: '2024-01-15T09:00:00Z',
  endTime: '2024-01-15T10:00:00Z',
  roomId: '660e8400-e29b-41d4-a716-446655440000',
  hostId: '770e8400-e29b-41d4-a716-446655440000',
  recurrence: 'none' as const,
  recurrenceEndsAt: null,
  seriesId: null,
  status: 'scheduled' as const,
  createdAt: '2024-01-14T08:00:00Z',
  updatedAt: '2024-01-14T08:00:00Z',
}

describe('meetingSchema', () => {
  it('parses a valid meeting', () => {
    const result = meetingSchema.safeParse(validMeeting)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(validMeeting)
    }
  })

  it('fills defaults for recurrence and status', () => {
    const { recurrence, status, ...rest } = validMeeting
    const result = meetingSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.recurrence).toBe('none')
      expect(result.data.status).toBe('scheduled')
    }
  })

  it('rejects missing title', () => {
    const { title, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects empty title', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, title: '' }).success).toBe(false)
  })

  it('rejects title exceeding 200 chars', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, title: 'x'.repeat(201) }).success).toBe(false)
  })

  it('accepts title at max 200 chars', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, title: 'x'.repeat(200) }).success).toBe(true)
  })

  it('rejects missing startTime', () => {
    const { startTime, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing endTime', () => {
    const { endTime, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing roomId', () => {
    const { roomId, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing hostId', () => {
    const { hostId, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects invalid UUID for id', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, id: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects invalid UUID for roomId', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, roomId: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects invalid UUID for hostId', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, hostId: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects invalid datetime for startTime', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, startTime: 'not-a-date' }).success).toBe(false)
  })

  it('rejects invalid datetime for endTime', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, endTime: 'not-a-date' }).success).toBe(false)
  })

  it('rejects invalid datetime for createdAt', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, createdAt: 'Jan 15 2024' }).success).toBe(false)
  })

  it('rejects invalid datetime for updatedAt', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, updatedAt: 'Jan 15 2024' }).success).toBe(false)
  })

  it('rejects invalid recurrence value', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, recurrence: 'yearly' }).success).toBe(false)
  })

  it('rejects invalid status value', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, status: 'in-progress' }).success).toBe(false)
  })

  it('accepts all valid recurrence values', () => {
    for (const r of ['none', 'daily', 'weekly', 'monthly'] as const) {
      expect(meetingSchema.safeParse({ ...validMeeting, recurrence: r }).success).toBe(true)
    }
  })

  it('accepts all valid status values', () => {
    for (const s of ['scheduled', 'cancelled', 'completed'] as const) {
      expect(meetingSchema.safeParse({ ...validMeeting, status: s }).success).toBe(true)
    }
  })

  it('allows description to be omitted', () => {
    const { description, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(true)
  })

  it('allows agenda to be omitted', () => {
    const { agenda, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(true)
  })

  it('allows recurrenceEndsAt to be omitted', () => {
    const { recurrenceEndsAt, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(true)
  })

  it('allows seriesId to be omitted', () => {
    const { seriesId, ...rest } = validMeeting
    expect(meetingSchema.safeParse(rest).success).toBe(true)
  })

  it('rejects description exceeding 2000 chars', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, description: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('rejects agenda exceeding 5000 chars', () => {
    expect(meetingSchema.safeParse({ ...validMeeting, agenda: 'x'.repeat(5001) }).success).toBe(false)
  })
})

describe('createMeetingSchema', () => {
  const validInput = {
    title: 'Sprint Planning',
    description: 'Weekly sprint planning',
    startTime: '2024-01-15T09:00:00Z',
    endTime: '2024-01-15T10:00:00Z',
    roomId: '660e8400-e29b-41d4-a716-446655440000',
    participantIds: ['770e8400-e29b-41d4-a716-446655440000'],
  }

  it('parses a valid createMeetingInput', () => {
    const result = createMeetingSchema.safeParse(validInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Sprint Planning')
      expect(result.data.participantIds).toHaveLength(1)
    }
  })

  it('accepts empty participantIds array', () => {
    expect(createMeetingSchema.safeParse({ ...validInput, participantIds: [] }).success).toBe(true)
  })

  it('rejects invalid UUID in participantIds', () => {
    expect(createMeetingSchema.safeParse({ ...validInput, participantIds: ['not-a-uuid'] }).success).toBe(false)
  })

  it('accepts multiple valid participantIds', () => {
    const input = {
      ...validInput,
      participantIds: [
        '770e8400-e29b-41d4-a716-446655440000',
        '880e8400-e29b-41d4-a716-446655440000',
      ],
    }
    expect(createMeetingSchema.safeParse(input).success).toBe(true)
  })

  it('defaults missing participantIds to an empty array', () => {
    const { participantIds, ...rest } = validInput
    const result = createMeetingSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.participantIds).toEqual([])
    }
  })

  it('rejects missing title', () => {
    const { title, ...rest } = validInput
    expect(createMeetingSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing startTime', () => {
    const { startTime, ...rest } = validInput
    expect(createMeetingSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing endTime', () => {
    const { endTime, ...rest } = validInput
    expect(createMeetingSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing roomId', () => {
    const { roomId, ...rest } = validInput
    expect(createMeetingSchema.safeParse(rest).success).toBe(false)
  })

  it('defaults recurrence to none when omitted', () => {
    const result = createMeetingSchema.safeParse(validInput)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.recurrence).toBe('none')
    }
  })

  it('allows optional agenda', () => {
    const result = createMeetingSchema.safeParse({ ...validInput, agenda: 'Discuss Q1' })
    expect(result.success).toBe(true)
  })

  it('allows optional recurrenceEndsAt', () => {
    const result = createMeetingSchema.safeParse({
      ...validInput,
      recurrence: 'weekly',
      recurrenceEndsAt: '2024-02-01T09:00:00Z',
    })
    expect(result.success).toBe(true)
  })
})
