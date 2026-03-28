const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function authFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    headers['Authorization'] = 'Bearer null'
  }

  return fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })
}

async function parseResponse<T>(response: Response): Promise<T> {
  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.error || 'Request failed')
  }
  return json.data
}

export async function register(data: {
  name: string
  email: string
  password: string
}) {
  const res = await authFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseResponse<{ user: unknown }>(res)
}

export async function login(data: { email: string; password: string }) {
  const res = await authFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const result = await parseResponse<{ token: string; user: unknown }>(res)
  localStorage.setItem('token', result.token)
  return result
}

export async function getRooms(page?: number, limit?: number) {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (limit !== undefined) params.set('limit', String(limit))
  const qs = params.toString()
  const path = qs ? `/rooms?${qs}` : '/rooms'
  const res = await authFetch(path)
  return parseResponse<unknown[]>(res)
}

export async function getRoom(id: string) {
  const res = await authFetch(`/rooms/${id}`)
  return parseResponse<unknown>(res)
}

export async function createRoom(data: {
  name: string
  capacity: number
  location?: string
  equipment?: string[]
}) {
  const res = await authFetch('/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseResponse<unknown>(res)
}

export async function getRoomAvailability(roomId: string, date: string) {
  const res = await authFetch(`/rooms/${roomId}/availability?date=${date}`)
  return parseResponse<unknown[]>(res)
}

export async function getMeetings(params?: {
  status?: string
  page?: number
  limit?: number
}) {
  const sp = new URLSearchParams()
  if (params?.status) sp.set('status', params.status)
  if (params?.page !== undefined) sp.set('page', String(params.page))
  if (params?.limit !== undefined) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  const path = qs ? `/meetings?${qs}` : '/meetings'
  const res = await authFetch(path)
  return parseResponse<unknown[]>(res)
}

export async function getMeeting(id: string) {
  const res = await authFetch(`/meetings/${id}`)
  return parseResponse<unknown>(res)
}

export async function createMeeting(data: {
  title: string
  startTime: string
  endTime: string
  roomId: string
  participantIds: string[]
  description?: string
  agenda?: string
  recurrence?: string
}) {
  const res = await authFetch('/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseResponse<unknown>(res)
}

export async function updateMeeting(id: string, data: Record<string, unknown>) {
  const res = await authFetch(`/meetings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseResponse<unknown>(res)
}

export async function cancelMeeting(id: string) {
  const res = await authFetch(`/meetings/${id}`, {
    method: 'DELETE',
  })
  return parseResponse<unknown>(res)
}

export async function confirmMeeting(id: string) {
  const res = await authFetch(`/meetings/${id}/confirm`, {
    method: 'POST',
  })
  return parseResponse<unknown>(res)
}

export async function getUsers() {
  const res = await authFetch('/users')
  return parseResponse<unknown[]>(res)
}

export async function getUser(id: string) {
  const res = await authFetch(`/users/${id}`)
  return parseResponse<unknown>(res)
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; role?: string },
) {
  const res = await authFetch(`/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseResponse<unknown>(res)
}
