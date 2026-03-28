import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  register,
  login,
  getRooms,
  getRoom,
  createRoom,
  getRoomAvailability,
  getMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  confirmMeeting,
  getUsers,
  getUser,
  updateUser,
} from '@/services/api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
  localStorage.clear()
})

describe('api client', () => {
  describe('register', () => {
    it('POSTs to /api/auth/register and returns data', async () => {
      const payload = { data: { user: { id: '1', name: 'Test', email: 'a@b.c' } } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await register({ name: 'Test', email: 'a@b.c', password: 'pass' })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer null',
        },
        body: JSON.stringify({ name: 'Test', email: 'a@b.c', password: 'pass' }),
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('login', () => {
    it('POSTs to /api/auth/login, stores token, returns data', async () => {
      const payload = { data: { token: 'jwt-123', user: { id: '1', email: 'a@b.c' } } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await login({ email: 'a@b.c', password: 'pass' })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer null',
        },
        body: JSON.stringify({ email: 'a@b.c', password: 'pass' }),
      })
      expect(result).toEqual(payload.data)
      expect(localStorage.getItem('token')).toBe('jwt-123')
    })
  })

  describe('getRooms', () => {
    it('GETs /api/rooms with pagination query params', async () => {
      const payload = { data: [{ id: 'r1' }, { id: 'r2' }] }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await getRooms(2, 10)

      expect(mockFetch).toHaveBeenCalledWith('/api/rooms?page=2&limit=10', {
        headers: { Authorization: 'Bearer null' },
      })
      expect(result).toEqual(payload.data)
    })

    it('GETs /api/rooms without query params', async () => {
      const payload = { data: [] }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      await getRooms()

      expect(mockFetch).toHaveBeenCalledWith('/api/rooms', {
        headers: { Authorization: 'Bearer null' },
      })
    })
  })

  describe('getRoom', () => {
    it('GETs /api/rooms/:id', async () => {
      const payload = { data: { id: 'r1', name: 'Room A' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await getRoom('r1')

      expect(mockFetch).toHaveBeenCalledWith('/api/rooms/r1', {
        headers: { Authorization: 'Bearer null' },
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('createRoom', () => {
    it('POSTs with auth header', async () => {
      localStorage.setItem('token', 'my-token')
      const payload = { data: { id: 'r1', name: 'Room A' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const body = { name: 'Room A', capacity: 10, location: 'Floor 1' }
      const result = await createRoom(body)

      expect(mockFetch).toHaveBeenCalledWith('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer my-token',
        },
        body: JSON.stringify(body),
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('getRoomAvailability', () => {
    it('GETs /api/rooms/:id/availability', async () => {
      const payload = { data: [{ startTime: '09:00', endTime: '10:00' }] }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await getRoomAvailability('r1', '2024-01-15')

      expect(mockFetch).toHaveBeenCalledWith('/api/rooms/r1/availability?date=2024-01-15', {
        headers: { Authorization: 'Bearer null' },
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('getMeetings', () => {
    it('GETs with status filter', async () => {
      const payload = { data: [{ id: 'm1' }] }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await getMeetings({ status: 'scheduled', page: 1, limit: 20 })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/meetings?status=scheduled&page=1&limit=20',
        { headers: { Authorization: 'Bearer null' } },
      )
      expect(result).toEqual(payload.data)
    })

    it('GETs without params', async () => {
      const payload = { data: [] }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      await getMeetings()

      expect(mockFetch).toHaveBeenCalledWith('/api/meetings', {
        headers: { Authorization: 'Bearer null' },
      })
    })
  })

  describe('getMeeting', () => {
    it('GETs /api/meetings/:id', async () => {
      const payload = { data: { id: 'm1', title: 'Sync' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await getMeeting('m1')

      expect(mockFetch).toHaveBeenCalledWith('/api/meetings/m1', {
        headers: { Authorization: 'Bearer null' },
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('createMeeting', () => {
    it('POSTs with auth header', async () => {
      localStorage.setItem('token', 'tok')
      const payload = { data: { id: 'm1' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const body = {
        title: 'Sync',
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T10:00:00Z',
        roomId: 'r1',
        participantIds: ['u1'],
      }
      const result = await createMeeting(body)

      expect(mockFetch).toHaveBeenCalledWith('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer tok',
        },
        body: JSON.stringify(body),
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('updateMeeting', () => {
    it('PUTs with auth header', async () => {
      localStorage.setItem('token', 'tok')
      const payload = { data: { id: 'm1', title: 'Updated' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await updateMeeting('m1', { title: 'Updated' })

      expect(mockFetch).toHaveBeenCalledWith('/api/meetings/m1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer tok',
        },
        body: JSON.stringify({ title: 'Updated' }),
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('cancelMeeting', () => {
    it('DELETEs with auth header', async () => {
      localStorage.setItem('token', 'tok')
      const payload = { data: { id: 'm1', status: 'cancelled' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await cancelMeeting('m1')

      expect(mockFetch).toHaveBeenCalledWith('/api/meetings/m1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer tok' },
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('confirmMeeting', () => {
    it('POSTs to /api/meetings/:id/confirm', async () => {
      localStorage.setItem('token', 'tok')
      const payload = { data: { id: 'm1', status: 'confirmed' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await confirmMeeting('m1')

      expect(mockFetch).toHaveBeenCalledWith('/api/meetings/m1/confirm', {
        method: 'POST',
        headers: { Authorization: 'Bearer tok' },
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('getUsers', () => {
    it('GETs /api/users', async () => {
      const payload = { data: [{ id: 'u1' }] }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await getUsers()

      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        headers: { Authorization: 'Bearer null' },
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('getUser', () => {
    it('GETs /api/users/:id', async () => {
      const payload = { data: { id: 'u1', name: 'User' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await getUser('u1')

      expect(mockFetch).toHaveBeenCalledWith('/api/users/u1', {
        headers: { Authorization: 'Bearer null' },
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('updateUser', () => {
    it('PATCHes /api/users/:id', async () => {
      localStorage.setItem('token', 'tok')
      const payload = { data: { id: 'u1', name: 'New' } }
      mockFetch.mockResolvedValue(jsonResponse(payload))

      const result = await updateUser('u1', { name: 'New' })

      expect(mockFetch).toHaveBeenCalledWith('/api/users/u1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer tok',
        },
        body: JSON.stringify({ name: 'New' }),
      })
      expect(result).toEqual(payload.data)
    })
  })

  describe('error handling', () => {
    it('throws with error message when response.ok is false', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ error: 'Invalid credentials' }, false, 401),
      )

      await expect(login({ email: 'a@b.c', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials',
      )
    })

    it('throws with default message when error field is missing', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({}, false, 500),
      )

      await expect(getRooms()).rejects.toThrow('Request failed')
    })
  })
})
