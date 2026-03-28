import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const configFile = join(homedir(), '.meetflowrc')

export interface CliConfig {
  server?: string
  token?: string
}

export async function loadConfig(): Promise<CliConfig> {
  if (!existsSync(configFile)) return {}
  const raw = readFileSync(configFile, 'utf-8')
  return JSON.parse(raw)
}

export async function saveConfig(partial: Record<string, string>): Promise<void> {
  const existing = await loadConfig()
  const merged = { ...existing, ...partial }
  writeFileSync(configFile, JSON.stringify(merged, null, 2))
}
