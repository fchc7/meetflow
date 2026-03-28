import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ApiClient } from '../../services/api.js'
import { listAction, readAction } from '../notification.js'

function createMockApi(): ApiClient {
  return {
    listNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
  } as unknown as ApiClient
}

describe('notification commands', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listAction', () => {
    it('fetches notifications without filters', async () => {
      const api = createMockApi()
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      ;(api.listNotifications as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await listAction(api, {})
      expect(api.listNotifications).toHaveBeenCalledWith(undefined)
    })

    it('fetches notifications with read filter', async () => {
      const api = createMockApi()
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      ;(api.listNotifications as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await listAction(api, { read: false })
      expect(api.listNotifications).toHaveBeenCalledWith({ read: 'false' })
    })

    it('outputs JSON when --json flag is set', async () => {
      const api = createMockApi()
      const notifications = [{ id: 'n1', type: 'reminder', message: 'test', read: false }]
      ;(api.listNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({ data: notifications, pagination: { page: 1, limit: 20, total: 1 } })
      await listAction(api, { json: true })
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(notifications, null, 2))
    })

    it('formats notifications as table', async () => {
      const api = createMockApi()
      const notifications = [{ id: 'n1', userId: 'u1', meetingId: 'm1', type: 'reminder', message: 'Meeting in 30min', read: false, createdAt: '2024-01-15T08:30:00Z' }]
      ;(api.listNotifications as ReturnType<typeof vi.fn>).mockResolvedValue({ data: notifications, pagination: { page: 1, limit: 20, total: 1 } })
      await listAction(api, {})
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('reminder'))
    })
  })

  describe('readAction', () => {
    it('marks notification as read', async () => {
      const api = createMockApi()
      const resp = { data: { id: 'n1', userId: 'u1', meetingId: 'm1', type: 'reminder', message: 'test', read: true, createdAt: '2024-01-15T08:30:00Z' } }
      ;(api.markNotificationRead as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await readAction(api, 'n1')
      expect(api.markNotificationRead).toHaveBeenCalledWith('n1')
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('read'))
    })
  })
})
