import type { CliConfig } from './config.js'
import { loadConfig } from './config.js'

export async function createApiClient() {
  const config = await loadConfig()
  const baseUrl = config.server || 'http://localhost:3000'

  return {
    async request<T>(path: string, options?: RequestInit): Promise<T> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options?.headers as Record<string, string>) || {}),
      }
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`
      }

      const res = await fetch(`${baseUrl}${path}`, { ...options, headers })
      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`)
      }
      return res.json() as Promise<T>
    },
  }
}
