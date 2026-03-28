import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ApiClient } from '../../services/api.js'
import { listAction, showAction, createAction, updateAction, cancelAction, confirmAction } from '../meeting.js'

function createMockApi(): ApiClient {
  return {
    listMeetings: vi.fn(),
    getMeeting: vi.fn(),
    createMeeting: vi.fn(),
    updateMeeting: vi.fn(),
    cancelMeeting: vi.fn(),
    confirmMeeting: vi.fn(),
  } as unknown as ApiClient
}

describe('meeting commands', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listAction', () => {
    it('fetches meetings without filters', async () => {
      const api = createMockApi()
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      ;(api.listMeetings as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await listAction(api, {})
      expect(api.listMeetings).toHaveBeenCalledWith(undefined)
    })

    it('fetches meetings with status and date filters', async () => {
      const api = createMockApi()
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      ;(api.listMeetings as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await listAction(api, { status: 'scheduled', date: '2024-01-15' })
      expect(api.listMeetings).toHaveBeenCalledWith({ status: 'scheduled', date: '2024-01-15' })
    })

    it('outputs JSON when --json flag is set', async () => {
      const api = createMockApi()
      const meetings = [{ id: 'm1', title: 'Test', status: 'scheduled' }]
      ;(api.listMeetings as ReturnType<typeof vi.fn>).mockResolvedValue({ data: meetings, pagination: { page: 1, limit: 20, total: 1 } })
      await listAction(api, { json: true })
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(meetings, null, 2))
    })

    it('outputs formatted table by default', async () => {
      const api = createMockApi()
      const meetings = [{ id: 'm1', title: 'Test', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T09:30:00Z', status: 'scheduled', recurrence: 'none', roomId: 'r1', hostId: 'u1' }]
      ;(api.listMeetings as ReturnType<typeof vi.fn>).mockResolvedValue({ data: meetings, pagination: { page: 1, limit: 20, total: 1 } })
      await listAction(api, {})
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Test'))
    })
  })

  describe('showAction', () => {
    it('fetches and displays meeting detail', async () => {
      const api = createMockApi()
      const detail = {
        data: {
          id: 'm1', title: 'Standup', description: 'Daily sync', startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T09:30:00Z', status: 'scheduled', recurrence: 'none', roomId: 'r1', hostId: 'u1',
          room: { id: 'r1', name: 'Room A', location: 'Floor 1', capacity: 10, equipment: [], createdAt: '2024-01-01T00:00:00Z' },
          participants: [{ userId: 'u2', status: 'confirmed', name: 'Alice', email: 'a@b.com' }],
        },
      }
      ;(api.getMeeting as ReturnType<typeof vi.fn>).mockResolvedValue(detail)
      await showAction(api, 'm1')
      expect(api.getMeeting).toHaveBeenCalledWith('m1')
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Standup'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Room A'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'))
    })
  })

  describe('createAction', () => {
    it('creates meeting with required fields', async () => {
      const api = createMockApi()
      const resp = { data: { id: 'm2', title: 'New Meeting', status: 'scheduled', participants: [] } }
      ;(api.createMeeting as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await createAction(api, {
        title: 'New Meeting',
        start: '2024-01-15T09:00:00Z',
        end: '2024-01-15T09:30:00Z',
        room: 'r1',
      })
      expect(api.createMeeting).toHaveBeenCalledWith({
        title: 'New Meeting',
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T09:30:00Z',
        roomId: 'r1',
        participantIds: [],
      })
    })

    it('calculates endTime from duration', async () => {
      const api = createMockApi()
      const resp = { data: { id: 'm2', title: 'New', status: 'scheduled', participants: [] } }
      ;(api.createMeeting as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await createAction(api, {
        title: 'New',
        start: '2024-01-15T09:00:00Z',
        duration: '60',
        room: 'r1',
      })
      expect(api.createMeeting).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: '2024-01-15T09:00:00Z',
          endTime: expect.stringContaining('2024-01-15T10:00:00'),
        }),
      )
    })

    it('parses comma-separated participants', async () => {
      const api = createMockApi()
      const resp = { data: { id: 'm2', title: 'New', status: 'scheduled', participants: [] } }
      ;(api.createMeeting as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await createAction(api, {
        title: 'New',
        start: '2024-01-15T09:00:00Z',
        end: '2024-01-15T09:30:00Z',
        room: 'r1',
        participants: 'u1,u2,u3',
      })
      expect(api.createMeeting).toHaveBeenCalledWith(
        expect.objectContaining({ participantIds: ['u1', 'u2', 'u3'] }),
      )
    })

    it('throws when neither end nor duration provided', async () => {
      const api = createMockApi()
      await expect(createAction(api, { title: 'New', start: '2024-01-15T09:00:00Z', room: 'r1' }))
        .rejects.toThrow('--end')
    })
  })

  describe('updateAction', () => {
    it('updates meeting with provided fields', async () => {
      const api = createMockApi()
      const resp = { data: { id: 'm1', title: 'Updated', status: 'scheduled', participants: [] } }
      ;(api.updateMeeting as ReturnType<typeof vi.fn>).mockResolvedValue(resp)
      await updateAction(api, 'm1', { title: 'Updated' })
      expect(api.updateMeeting).toHaveBeenCalledWith('m1', { title: 'Updated' })
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Updated'))
    })

    it('calculates endTime from duration for update', async () => {
      const api = createMockApi()
      ;(api.updateMeeting as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'm1', title: 'Test', status: 'scheduled', participants: [] } })
      await updateAction(api, 'm1', { start: '2024-01-15T10:00:00Z', duration: '30' })
      expect(api.updateMeeting).toHaveBeenCalledWith('m1', expect.objectContaining({
        startTime: '2024-01-15T10:00:00Z',
        endTime: expect.stringContaining('2024-01-15T10:30:00'),
      }))
    })
  })

  describe('cancelAction', () => {
    it('cancels a meeting', async () => {
      const api = createMockApi()
      ;(api.cancelMeeting as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'm1', title: 'Test', status: 'cancelled' } })
      await cancelAction(api, 'm1')
      expect(api.cancelMeeting).toHaveBeenCalledWith('m1')
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('cancelled'))
    })
  })

  describe('confirmAction', () => {
    it('confirms meeting attendance', async () => {
      const api = createMockApi()
      ;(api.confirmMeeting as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { meetingId: 'm1', userId: 'u1', status: 'confirmed' } })
      await confirmAction(api, 'm1')
      expect(api.confirmMeeting).toHaveBeenCalledWith('m1')
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('confirmed'))
    })
  })
})
