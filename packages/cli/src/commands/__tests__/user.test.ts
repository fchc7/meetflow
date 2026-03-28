import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ApiClient } from '../../services/api.js'
import { listAction, showAction } from '../user.js'

function createMockApi(): ApiClient {
  return {
    listUsers: vi.fn(),
    getUser: vi.fn(),
  } as unknown as ApiClient
}

describe('user commands', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listAction', () => {
    it('fetches and displays user list', async () => {
      const api = createMockApi()
      const users = [
        { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'host', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'participant', createdAt: '2024-01-02T00:00:00Z' },
      ]
      ;(api.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: users })
      await listAction(api, {})
      expect(api.listUsers).toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Bob'))
    })

    it('outputs JSON when --json flag is set', async () => {
      const api = createMockApi()
      const users = [{ id: 'u1', name: 'Alice', email: 'a@b.com', role: 'host', createdAt: '2024-01-01T00:00:00Z' }]
      ;(api.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: users })
      await listAction(api, { json: true })
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(users, null, 2))
    })
  })

  describe('showAction', () => {
    it('fetches and displays user detail', async () => {
      const api = createMockApi()
      const user = { data: { user: { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'host', createdAt: '2024-01-01T00:00:00Z' } } }
      ;(api.getUser as ReturnType<typeof vi.fn>).mockResolvedValue(user)
      await showAction(api, 'u1')
      expect(api.getUser).toHaveBeenCalledWith('u1')
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('alice@test.com'))
    })
  })
})
