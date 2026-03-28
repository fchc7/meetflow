import type { Command } from 'commander'
import { configFile, saveConfig } from '../services/config.js'

export function registerConfigCommand(program: Command) {
  program
    .command('config')
    .description('Configure CLI settings')
    .option('--server <url>', 'Server URL')
    .option('--token <jwt>', 'Auth token')
    .action(async (opts) => {
      const config: Record<string, string> = {}
      if (opts.server) config.server = opts.server
      if (opts.token) config.token = opts.token
      await saveConfig(config)
      console.log('Configuration saved to', configFile)
    })
}
