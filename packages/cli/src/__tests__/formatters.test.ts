import { describe, it, expect } from 'vitest'
import {
  formatMeetingList,
  formatMeetingDetail,
  formatRoomList,
  formatRoomDetail,
  formatUserList,
  formatNotificationList,
} from '../formatters.js'

const meeting = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Team Standup',
  startTime: '2024-01-15T09:00:00Z',
  endTime: '2024-01-15T09:30:00Z',
  status: 'scheduled',
  recurrence: 'none',
  roomId: 'r1',
  hostId: 'u1',
}

describe('formatMeetingList', () => {
  it('returns empty message when no meetings', () => {
    const result = formatMeetingList([])
    expect(result).toContain('No meetings')
  })

  it('formats meetings as table rows', () => {
    const result = formatMeetingList([meeting])
    expect(result).toContain('Team Standup')
    expect(result).toContain('scheduled')
  })

  it('shows multiple meetings', () => {
    const result = formatMeetingList([meeting, { ...meeting, id: '2', title: 'Sprint Planning' }])
    expect(result).toContain('Team Standup')
    expect(result).toContain('Sprint Planning')
  })
})

describe('formatMeetingDetail', () => {
  it('formats full meeting detail with room and participants', () => {
    const detail = {
      ...meeting,
      description: 'Daily sync',
      agenda: 'Review blockers',
      room: { id: 'r1', name: 'Room A', location: 'Floor 1', capacity: 10, equipment: ['projector'], createdAt: '2024-01-01T00:00:00Z' },
      participants: [
        { userId: 'u2', status: 'confirmed', name: 'Alice', email: 'alice@test.com' },
        { userId: 'u3', status: 'pending', name: 'Bob', email: 'bob@test.com' },
      ],
    }
    const result = formatMeetingDetail(detail)
    expect(result).toContain('Team Standup')
    expect(result).toContain('Daily sync')
    expect(result).toContain('Room A')
    expect(result).toContain('Alice')
    expect(result).toContain('Bob')
    expect(result).toContain('confirmed')
    expect(result).toContain('pending')
  })
})

describe('formatRoomList', () => {
  it('returns empty message when no rooms', () => {
    expect(formatRoomList([])).toContain('No rooms')
  })

  it('formats rooms as table rows', () => {
    const rooms = [{ id: 'r1', name: 'Room A', location: 'Floor 1', capacity: 10, equipment: [], createdAt: '2024-01-01T00:00:00Z' }]
    const result = formatRoomList(rooms)
    expect(result).toContain('Room A')
    expect(result).toContain('Floor 1')
    expect(result).toContain('10')
  })
})

describe('formatRoomDetail', () => {
  it('formats room detail with equipment', () => {
    const room = { id: 'r1', name: 'Room A', location: 'Floor 1', capacity: 10, equipment: ['projector', 'whiteboard'], createdAt: '2024-01-01T00:00:00Z' }
    const result = formatRoomDetail(room)
    expect(result).toContain('Room A')
    expect(result).toContain('Floor 1')
    expect(result).toContain('projector')
    expect(result).toContain('whiteboard')
  })
})

describe('formatUserList', () => {
  it('returns empty message when no users', () => {
    expect(formatUserList([])).toContain('No users')
  })

  it('formats users as table rows', () => {
    const users = [
      { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'host' as const, createdAt: '2024-01-01T00:00:00Z' },
      { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'participant' as const, createdAt: '2024-01-02T00:00:00Z' },
    ]
    const result = formatUserList(users)
    expect(result).toContain('Alice')
    expect(result).toContain('alice@test.com')
    expect(result).toContain('Bob')
    expect(result).toContain('host')
    expect(result).toContain('participant')
  })
})

describe('formatNotificationList', () => {
  it('returns empty message when no notifications', () => {
    expect(formatNotificationList([])).toContain('No notifications')
  })

  it('formats notifications as table rows', () => {
    const notifications = [
      { id: 'n1', userId: 'u1', meetingId: 'm1', type: 'reminder', message: 'Meeting in 30min', read: false, createdAt: '2024-01-15T08:30:00Z' },
    ]
    const result = formatNotificationList(notifications)
    expect(result).toContain('reminder')
    expect(result).toContain('Meeting in 30min')
  })
})
