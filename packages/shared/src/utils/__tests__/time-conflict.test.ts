import { describe, expect, it } from 'vitest'
import { hasTimeConflict } from '../time-conflict.js'

describe('hasTimeConflict', () => {
  const time = (h: number) => `2024-01-15T${String(h).padStart(2, '0')}:00:00Z`

  it('returns false when existing list is empty', () => {
    expect(hasTimeConflict([], { start: time(9), end: time(10) })).toBe(false)
  })

  it('returns false for completely disjoint ranges', () => {
    const existing = [{ start: time(8), end: time(9) }]
    const incoming = { start: time(10), end: time(11) }
    expect(hasTimeConflict(existing, incoming)).toBe(false)
  })

  it('returns false for adjacent ranges (end === start)', () => {
    const existing = [{ start: time(9), end: time(10) }]
    const incoming = { start: time(10), end: time(11) }
    expect(hasTimeConflict(existing, incoming)).toBe(false)
  })

  it('returns false for adjacent ranges (incoming end === existing start)', () => {
    const existing = [{ start: time(11), end: time(12) }]
    const incoming = { start: time(10), end: time(11) }
    expect(hasTimeConflict(existing, incoming)).toBe(false)
  })

  it('detects overlap when incoming starts before existing ends', () => {
    const existing = [{ start: time(9), end: time(11) }]
    const incoming = { start: time(10), end: time(12) }
    expect(hasTimeConflict(existing, incoming)).toBe(true)
  })

  it('detects overlap when incoming ends after existing starts', () => {
    const existing = [{ start: time(10), end: time(12) }]
    const incoming = { start: time(9), end: time(11) }
    expect(hasTimeConflict(existing, incoming)).toBe(true)
  })

  it('detects complete overlap (incoming fully contains existing)', () => {
    const existing = [{ start: time(10), end: time(11) }]
    const incoming = { start: time(9), end: time(12) }
    expect(hasTimeConflict(existing, incoming)).toBe(true)
  })

  it('detects complete overlap (existing fully contains incoming)', () => {
    const existing = [{ start: time(9), end: time(12) }]
    const incoming = { start: time(10), end: time(11) }
    expect(hasTimeConflict(existing, incoming)).toBe(true)
  })

  it('detects exact same range as conflict', () => {
    const existing = [{ start: time(9), end: time(10) }]
    const incoming = { start: time(9), end: time(10) }
    expect(hasTimeConflict(existing, incoming)).toBe(true)
  })

  it('returns true when one of multiple existing ranges conflicts', () => {
    const existing = [
      { start: time(8), end: time(9) },
      { start: time(10), end: time(11) },
      { start: time(13), end: time(14) },
    ]
    const incoming = { start: time(10), end: time(11) }
    expect(hasTimeConflict(existing, incoming)).toBe(true)
  })

  it('returns false when no range in multiple existing conflicts', () => {
    const existing = [
      { start: time(8), end: time(9) },
      { start: time(10), end: time(11) },
      { start: time(13), end: time(14) },
    ]
    const incoming = { start: time(11), end: time(12) }
    expect(hasTimeConflict(existing, incoming)).toBe(false)
  })
})
