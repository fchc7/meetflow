import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ApiClient } from '../../services/api.js'
import { listAction, showAction, createAction } from '../room.js'

function createMockApi(): ApiClient {
  return {
    listRooms: vi.fn(),
    getRoom: vi.fn(),
    createRoom: vi.fn(),
    getRoomAvailability: vi.fn(),
  } as unknown as ApiClient
}

describe('room commands', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listAction', () => {
    it('fetches rooms without filters', async () => {
      const api = createMockApi()
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      ;(api.listRooms as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await listAction(api, {})
      expect(api.listRooms).toHaveBeenCalledWith(undefined)
    })

    it('fetches rooms with availability filter', async () => {
      const api = createMockApi()
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      ;(api.listRooms as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await listAction(api, { available: true, date: '2024-01-15' })
      expect(api.listRooms).toHaveBeenCalledWith({ available: 'true', date: '2024-01-15' })
    })

    it('outputs JSON when --json flag is set', async () => {
      const api = createMockApi()
      const rooms = [{ id: 'r1', name: 'Room A' }]
      ;(api.listRooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: rooms, pagination: { page: 1, limit: 20, total: 1 } })
      await listAction(api, { json: true })
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(rooms, null, 2))
    })
  })

  describe('showAction', () => {
    it('fetches and displays room detail', async () => {
      const api = createMockApi()
      const detail = { data: { id: 'r1', name: 'Room A', location: 'Floor 1', capacity: 10, equipment: ['projector'], createdAt: '2024-01-01T00:00:00Z' } }
      ;(api.getRoom as ReturnType<typeof vi.fn>).mockResolvedValue(detail)
      await showAction(api, 'r1')
      expect(api.getRoom).toHaveBeenCalledWith('r1')
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Room A'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('projector'))
    })
  })

  describe('createAction', () => {
    it('creates a room with required fields', async () => {
      const api = createMockApi()
      const resp = { data: { id: 'r1', name: 'Room B', capacity: 20, location: 'Floor 2', equipment: [], createdAt: '2024-01-01T00:00:00Z' } }
      ;(api.createRoom as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await createAction(api, { name: 'Room B', capacity: '20', location: 'Floor 2' })
      expect(api.createRoom).toHaveBeenCalledWith({ name: 'Room B', capacity: 20, location: 'Floor 2', equipment: [] })
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Room B'))
    })

    it('creates a room without optional fields', async () => {
      const api = createMockApi()
      const resp = { data: { id: 'r1', name: 'Room C', capacity: 5, equipment: [], createdAt: '2024-01-01T00:00:00Z' } }
      ;(api.createRoom as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await createAction(api, { name: 'Room C', capacity: '5' })
      expect(api.createRoom).toHaveBeenCalledWith({ name: 'Room C', capacity: 5, equipment: [] })
    })
  })
})
