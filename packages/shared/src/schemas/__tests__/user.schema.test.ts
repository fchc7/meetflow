import { describe, expect, it } from 'vitest'
import { userSchema } from '../user.schema.js'

const validUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice Smith',
  email: 'alice@example.com',
  createdAt: '2024-01-14T08:00:00Z',
}

describe('userSchema', () => {
  it('parses a valid user', () => {
    const result = userSchema.safeParse(validUser)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ ...validUser, role: 'participant' })
    }
  })

  it('defaults role to participant when omitted', () => {
    const result = userSchema.safeParse(validUser)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('participant')
    }
  })

  it('accepts all valid roles', () => {
    for (const role of ['admin', 'host', 'participant'] as const) {
      const result = userSchema.safeParse({ ...validUser, role })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe(role)
      }
    }
  })

  it('rejects missing id', () => {
    const { id, ...rest } = validUser
    expect(userSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects invalid UUID for id', () => {
    expect(userSchema.safeParse({ ...validUser, id: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects missing name', () => {
    const { name, ...rest } = validUser
    expect(userSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects empty name', () => {
    expect(userSchema.safeParse({ ...validUser, name: '' }).success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    expect(userSchema.safeParse({ ...validUser, name: 'x'.repeat(101) }).success).toBe(false)
  })

  it('accepts name at max 100 chars', () => {
    expect(userSchema.safeParse({ ...validUser, name: 'x'.repeat(100) }).success).toBe(true)
  })

  it('rejects missing email', () => {
    const { email, ...rest } = validUser
    expect(userSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects invalid email', () => {
    const invalidEmails = ['not-an-email', '@example.com', 'alice@', 'alice', 'alice @example.com']
    for (const email of invalidEmails) {
      expect(userSchema.safeParse({ ...validUser, email }).success).toBe(false)
    }
  })

  it('rejects invalid role', () => {
    expect(userSchema.safeParse({ ...validUser, role: 'superadmin' }).success).toBe(false)
  })

  it('rejects missing createdAt', () => {
    const { createdAt, ...rest } = validUser
    expect(userSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects invalid datetime for createdAt', () => {
    expect(userSchema.safeParse({ ...validUser, createdAt: 'not-a-date' }).success).toBe(false)
  })
})
