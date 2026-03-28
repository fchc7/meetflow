import { describe, expect, it } from 'vitest'
import { roomSchema } from '../room.schema.js'

const validRoom = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Conference Room A',
  capacity: 10,
  createdAt: '2024-01-14T08:00:00Z',
}

describe('roomSchema', () => {
  it('parses a valid room', () => {
    const result = roomSchema.safeParse(validRoom)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ ...validRoom, equipment: [] })
    }
  })

  it('parses a room with all fields', () => {
    const room = {
      ...validRoom,
      location: 'Building 1, Floor 2',
      equipment: ['projector', 'whiteboard'],
    }
    const result = roomSchema.safeParse(room)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.equipment).toEqual(['projector', 'whiteboard'])
      expect(result.data.location).toBe('Building 1, Floor 2')
    }
  })

  it('defaults equipment to empty array', () => {
    const result = roomSchema.safeParse(validRoom)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.equipment).toEqual([])
    }
  })

  it('allows optional location to be omitted', () => {
    const result = roomSchema.safeParse(validRoom)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.location).toBeUndefined()
    }
  })

  it('rejects missing name', () => {
    const { name, ...rest } = validRoom
    expect(roomSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects empty name', () => {
    expect(roomSchema.safeParse({ ...validRoom, name: '' }).success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    expect(roomSchema.safeParse({ ...validRoom, name: 'x'.repeat(101) }).success).toBe(false)
  })

  it('accepts name at max 100 chars', () => {
    expect(roomSchema.safeParse({ ...validRoom, name: 'x'.repeat(100) }).success).toBe(true)
  })

  it('rejects missing capacity', () => {
    const { capacity, ...rest } = validRoom
    expect(roomSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects zero capacity', () => {
    expect(roomSchema.safeParse({ ...validRoom, capacity: 0 }).success).toBe(false)
  })

  it('rejects negative capacity', () => {
    expect(roomSchema.safeParse({ ...validRoom, capacity: -1 }).success).toBe(false)
  })

  it('rejects non-integer capacity', () => {
    expect(roomSchema.safeParse({ ...validRoom, capacity: 5.5 }).success).toBe(false)
  })

  it('rejects missing id', () => {
    const { id, ...rest } = validRoom
    expect(roomSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects invalid UUID for id', () => {
    expect(roomSchema.safeParse({ ...validRoom, id: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects invalid datetime for createdAt', () => {
    expect(roomSchema.safeParse({ ...validRoom, createdAt: 'not-a-date' }).success).toBe(false)
  })

  it('rejects missing createdAt', () => {
    const { createdAt, ...rest } = validRoom
    expect(roomSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects location exceeding 200 chars', () => {
    expect(roomSchema.safeParse({ ...validRoom, location: 'x'.repeat(201) }).success).toBe(false)
  })
})
