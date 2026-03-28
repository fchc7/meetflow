import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ApiClient } from '../../services/api.js'
import { loginAction, registerAction } from '../auth.js'

function createMockApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    login: vi.fn(),
    register: vi.fn(),
    setToken: vi.fn(),
    ...overrides,
  } as unknown as ApiClient
}

describe('auth commands', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>
  let mockSaveConfig: ReturnType<typeof vi.fn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSaveConfig = vi.fn()
    vi.mock('../../services/config.js', () => ({
      saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
      configFile: '/home/.meetflowrc',
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loginAction', () => {
    it('calls api.login and saves token', async () => {
      const api = createMockApiClient()
      ;(api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: '1', name: 'Alice', email: 'a@b.com', role: 'host' }, token: 'jwt-token' },
      })
      await loginAction(api, 'a@b.com', 'pass123', mockSaveConfig)
      expect(api.login).toHaveBeenCalledWith('a@b.com', 'pass123')
      expect(mockSaveConfig).toHaveBeenCalledWith({ token: 'jwt-token' })
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Alice'))
    })

    it('throws on API error', async () => {
      const api = createMockApiClient()
      ;(api.login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'))
      await expect(loginAction(api, 'a@b.com', 'wrong', mockSaveConfig)).rejects.toThrow('Invalid credentials')
    })
  })

  describe('registerAction', () => {
    it('calls api.register and saves token', async () => {
      const api = createMockApiClient()
      ;(api.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: '2', name: 'Bob', email: 'b@b.com', role: 'participant' }, token: 'jwt2' },
      })
      await registerAction(api, 'Bob', 'b@b.com', 'secret', mockSaveConfig)
      expect(api.register).toHaveBeenCalledWith('Bob', 'b@b.com', 'secret')
      expect(mockSaveConfig).toHaveBeenCalledWith({ token: 'jwt2' })
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Bob'))
    })

    it('throws on API error', async () => {
      const api = createMockApiClient()
      ;(api.register as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Email already registered'))
      await expect(registerAction(api, 'Bob', 'b@b.com', 'secret', mockSaveConfig)).rejects.toThrow('Email already registered')
    })
  })
})
