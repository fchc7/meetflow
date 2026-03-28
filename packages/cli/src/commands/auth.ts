import type { Command } from 'commander'
import type { ApiClient } from '../services/api.js'
import { createApiClient } from '../services/api.js'
import { saveConfig } from '../services/config.js'
import pc from 'picocolors'

export async function loginAction(api: ApiClient, email: string, password: string, save: typeof saveConfig) {
  const result = await api.login(email, password)
  await save({ token: result.data.token })
  console.log(pc.green(`Logged in as ${result.data.user.name} (${result.data.user.email})`))
}

export async function registerAction(api: ApiClient, name: string, email: string, password: string, save: typeof saveConfig) {
  const result = await api.register(name, email, password)
  await save({ token: result.data.token })
  console.log(pc.green(`Registered as ${result.data.user.name} (${result.data.user.email})`))
}

export function registerAuthCommand(program: Command) {
  const auth = program.command('auth').alias('a').description('Authentication')

  auth
    .command('login')
    .description('Login to MeetFlow')
    .requiredOption('--email <email>', 'Email address')
    .requiredOption('--password <password>', 'Password')
    .action(async (opts) => {
      try {
        const api = await createApiClient()
        await loginAction(api, opts.email, opts.password, saveConfig)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })

  auth
    .command('register')
    .description('Register a new account')
    .requiredOption('--name <name>', 'Display name')
    .requiredOption('--email <email>', 'Email address')
    .requiredOption('--password <password>', 'Password (min 6 characters)')
    .action(async (opts) => {
      try {
        const api = await createApiClient()
        await registerAction(api, opts.name, opts.email, opts.password, saveConfig)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })
}
