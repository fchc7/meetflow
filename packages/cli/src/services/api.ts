import { loadConfig } from './config.js'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class ApiClient {
  private baseUrl: string
  private _token?: string

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl
    this._token = token
  }

  setToken(token: string) {
    this._token = token
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`
    }
    if (options?.headers) {
      Object.assign(headers, options.headers as Record<string, string>)
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers })
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`
      try {
        const body = (await res.json()) as { error?: string }
        if (typeof body.error === 'string') {
          message = body.error
        }
      } catch {}
      throw new ApiError(res.status, message)
    }
    return res.json() as Promise<T>
  }

  async login(email: string, password: string) {
    return this.request<{ data: { user: { id: string; name: string; email: string; role: string }; token: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(name: string, email: string, password: string) {
    return this.request<{ data: { user: { id: string; name: string; email: string; role: string }; token: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  }

  async listMeetings(params?: Record<string, string>) {
    const query = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<{ data: MeetingListItem[]; pagination: PaginatedInfo }>(`/api/meetings${query}`)
  }

  async getMeeting(id: string) {
    return this.request<{ data: MeetingDetail }>(`/api/meetings/${id}`)
  }

  async createMeeting(data: {
    title: string
    startTime: string
    endTime: string
    roomId: string
    participantIds?: string[]
    description?: string
    agenda?: string
    recurrence?: string
  }) {
    return this.request<{ data: { id: string; title: string; status: string; participants: Array<{ meetingId: string; userId: string; status: string }> } }>('/api/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateMeeting(id: string, data: Record<string, unknown>) {
    return this.request<{ data: { id: string; title: string; status: string; participants: Array<{ meetingId: string; userId: string; status: string }> } }>(`/api/meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async cancelMeeting(id: string) {
    return this.request<{ data: { id: string; title: string; status: string } }>(`/api/meetings/${id}`, {
      method: 'DELETE',
    })
  }

  async confirmMeeting(id: string) {
    return this.request<{ data: { meetingId: string; userId: string; status: string } }>(`/api/meetings/${id}/confirm`, {
      method: 'POST',
    })
  }

  async listRooms(params?: Record<string, string>) {
    const query = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<{ data: RoomListItem[]; pagination: PaginatedInfo }>(`/api/rooms${query}`)
  }

  async getRoom(id: string) {
    return this.request<{ data: RoomListItem }>(`/api/rooms/${id}`)
  }

  async createRoom(data: { name: string; capacity: number; location?: string; equipment?: string[] }) {
    return this.request<{ data: RoomListItem }>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getRoomAvailability(id: string, date: string) {
    return this.request<{ data: { roomId: string; date: string; bookedSlots: Array<{ start: string; end: string }> } }>(`/api/rooms/${id}/availability?date=${encodeURIComponent(date)}`)
  }

  async listUsers() {
    return this.request<{ data: UserListItem[] }>('/api/users')
  }

  async getUser(id: string) {
    return this.request<{ data: { user: UserListItem } }>(`/api/users/${id}`)
  }

  async updateUser(id: string, data: { name?: string; email?: string; role?: string }) {
    return this.request<{ data: { user: UserListItem } }>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async listNotifications(params?: Record<string, string>) {
    const query = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<{ data: NotificationListItem[]; pagination: PaginatedInfo }>(`/api/notifications${query}`)
  }

  async markNotificationRead(id: string) {
    return this.request<{ data: NotificationListItem }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    })
  }
}

export async function createApiClient(): Promise<ApiClient> {
  const config = await loadConfig()
  return new ApiClient(config.server || 'http://localhost:3000', config.token)
}

interface PaginatedInfo {
  page: number
  limit: number
  total: number
}

interface MeetingListItem {
  id: string
  title: string
  startTime: string
  endTime: string
  status: string
  recurrence: string
  roomId: string
  hostId: string
}

interface MeetingDetail extends MeetingListItem {
  description?: string
  agenda?: string
  room: {
    id: string
    name: string
    location?: string
    capacity: number
    equipment: string[]
    createdAt: string
  }
  participants: Array<{
    userId: string
    status: string
    name: string
    email: string
  }>
}

interface RoomListItem {
  id: string
  name: string
  location?: string
  capacity: number
  equipment: string[]
  createdAt: string
}

interface UserListItem {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface NotificationListItem {
  id: string
  userId: string
  meetingId: string
  type: string
  message: string
  read: boolean
  createdAt: string
}

export type { MeetingListItem, MeetingDetail, RoomListItem, UserListItem, NotificationListItem }
