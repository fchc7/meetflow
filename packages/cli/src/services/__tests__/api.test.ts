import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClient, ApiError } from '../api.js'

function okResponse(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) }
}

function errResponse(status: number, statusText: string, body: unknown) {
  return { ok: false, status, statusText, json: () => Promise.resolve(body) }
}

describe('ApiClient', () => {
  let client: ApiClient
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    client = new ApiClient('http://localhost:3000', 'test-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends Authorization header when token is set', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: [] }))
    await client.listUsers()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    )
  })

  it('omits Authorization header when no token', async () => {
    const noTokenClient = new ApiClient('http://localhost:3000')
    mockFetch.mockResolvedValue(okResponse({ data: [] }))
    await noTokenClient.listUsers()
    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('throws ApiError with server error message on non-ok response', async () => {
    mockFetch.mockResolvedValue(errResponse(403, 'Forbidden', { error: 'Forbidden' }))
    try {
      await client.listUsers()
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(403)
      expect((err as ApiError).message).toBe('Forbidden')
    }
  })

  it('throws ApiError with status text when body has no error field', async () => {
    mockFetch.mockResolvedValue(errResponse(500, 'Internal Server Error', {}))
    try {
      await client.listUsers()
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).message).toBe('500 Internal Server Error')
    }
  })

  describe('login', () => {
    it('POSTs to /api/auth/login with email and password', async () => {
      const resp = { data: { user: { id: '1', name: 'Alice', email: 'a@b.com', role: 'host' }, token: 'jwt' } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.login('a@b.com', 'pass123')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: 'pass123' }),
        }),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('register', () => {
    it('POSTs to /api/auth/register with name, email, password', async () => {
      const resp = { data: { user: { id: '2', name: 'Bob', email: 'b@b.com', role: 'participant' }, token: 'jwt2' } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.register('Bob', 'b@b.com', 'secret')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Bob', email: 'b@b.com', password: 'secret' }),
        }),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('listMeetings', () => {
    it('GETs /api/meetings with query params', async () => {
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.listMeetings({ status: 'scheduled', date: '2024-01-15' })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/meetings?status=scheduled&date=2024-01-15'),
        expect.any(Object),
      )
      expect(result).toEqual(resp)
    })

    it('GETs /api/meetings without params', async () => {
      mockFetch.mockResolvedValue(okResponse({ data: [], pagination: { page: 1, limit: 20, total: 0 } }))
      await client.listMeetings()
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/meetings', expect.any(Object))
    })
  })

  describe('getMeeting', () => {
    it('GETs /api/meetings/:id', async () => {
      const resp = { data: { id: 'm1', title: 'Test', participants: [] } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.getMeeting('m1')
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/meetings/m1', expect.any(Object))
      expect(result).toEqual(resp)
    })
  })

  describe('createMeeting', () => {
    it('POSTs to /api/meetings', async () => {
      const body = { title: 'Standup', startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T09:30:00Z', roomId: 'r1', participantIds: ['u1'] }
      const resp = { data: { id: 'm2', title: 'Standup', status: 'scheduled', participants: [] } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.createMeeting(body)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/meetings',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('updateMeeting', () => {
    it('PUTs to /api/meetings/:id', async () => {
      const body = { title: 'Updated' }
      const resp = { data: { id: 'm1', title: 'Updated', status: 'scheduled', participants: [] } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.updateMeeting('m1', body)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/meetings/m1',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) }),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('cancelMeeting', () => {
    it('DELETEs /api/meetings/:id', async () => {
      const resp = { data: { id: 'm1', title: 'Test', status: 'cancelled' } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.cancelMeeting('m1')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/meetings/m1',
        expect.objectContaining({ method: 'DELETE' }),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('confirmMeeting', () => {
    it('POSTs to /api/meetings/:id/confirm', async () => {
      const resp = { data: { meetingId: 'm1', userId: 'u1', status: 'confirmed' } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.confirmMeeting('m1')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/meetings/m1/confirm',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('listRooms', () => {
    it('GETs /api/rooms with query params', async () => {
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      mockFetch.mockResolvedValue(okResponse(resp))
      await client.listRooms({ available: 'true', date: '2024-01-15' })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms?available=true&date=2024-01-15'),
        expect.any(Object),
      )
    })
  })

  describe('getRoom', () => {
    it('GETs /api/rooms/:id', async () => {
      const resp = { data: { id: 'r1', name: 'Room A', capacity: 10 } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.getRoom('r1')
      expect(result).toEqual(resp)
    })
  })

  describe('createRoom', () => {
    it('POSTs to /api/rooms', async () => {
      const body = { name: 'Room B', capacity: 20, location: 'Floor 2' }
      const resp = { data: { id: 'r2', ...body, equipment: [] } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.createRoom(body)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/rooms',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('getRoomAvailability', () => {
    it('GETs /api/rooms/:id/availability?date=...', async () => {
      const resp = { data: { roomId: 'r1', date: '2024-01-15', bookedSlots: [] } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.getRoomAvailability('r1', '2024-01-15')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/rooms/r1/availability?date=2024-01-15',
        expect.any(Object),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('listUsers', () => {
    it('GETs /api/users', async () => {
      const resp = { data: [{ id: 'u1', name: 'Alice', email: 'a@b.com', role: 'host', createdAt: '2024-01-01T00:00:00Z' }] }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.listUsers()
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users', expect.any(Object))
      expect(result).toEqual(resp)
    })
  })

  describe('getUser', () => {
    it('GETs /api/users/:id', async () => {
      const resp = { data: { user: { id: 'u1', name: 'Alice', email: 'a@b.com', role: 'host', createdAt: '2024-01-01T00:00:00Z' } } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.getUser('u1')
      expect(result).toEqual(resp)
    })
  })

  describe('updateUser', () => {
    it('PATCHes /api/users/:id', async () => {
      const body = { name: 'Alice Updated' }
      const resp = { data: { user: { id: 'u1', name: 'Alice Updated', email: 'a@b.com', role: 'host', createdAt: '2024-01-01T00:00:00Z' } } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.updateUser('u1', body)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/users/u1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify(body) }),
      )
      expect(result).toEqual(resp)
    })
  })

  describe('listNotifications', () => {
    it('GETs /api/notifications with params', async () => {
      const resp = { data: [], pagination: { page: 1, limit: 20, total: 0 } }
      mockFetch.mockResolvedValue(okResponse(resp))
      await client.listNotifications({ read: 'false' })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications?read=false'),
        expect.any(Object),
      )
    })
  })

  describe('markNotificationRead', () => {
    it('PATCHes /api/notifications/:id/read', async () => {
      const resp = { data: { id: 'n1', read: true, message: 'test' } }
      mockFetch.mockResolvedValue(okResponse(resp))
      const result = await client.markNotificationRead('n1')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/n1/read',
        expect.objectContaining({ method: 'PATCH' }),
      )
      expect(result).toEqual(resp)
    })
  })
})
