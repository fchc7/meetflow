import type { Command } from 'commander'
import type { ApiClient } from '../services/api.js'
import { createApiClient } from '../services/api.js'
import { formatUserList } from '../formatters.js'
import pc from 'picocolors'

export async function listAction(api: ApiClient, opts: { json?: boolean }) {
  const result = await api.listUsers()
  if (opts.json) {
    console.log(JSON.stringify(result.data, null, 2))
  } else {
    console.log(formatUserList(result.data))
  }
}

export async function showAction(api: ApiClient, id: string) {
  const result = await api.getUser(id)
  const u = result.data.user
  console.log(pc.bold(`User: ${u.name}`))
  console.log(pc.dim('─'.repeat(40)))
  console.log(`  ID:     ${u.id}`)
  console.log(`  Email:  ${u.email}`)
  console.log(`  Role:   ${u.role}`)
}

export function registerUserCommand(program: Command) {
  const user = program.command('user').alias('u').description('Manage users')

  user
    .command('list')
    .description('List all users')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const api = await createApiClient()
        await listAction(api, opts)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })

  user
    .command('show <id>')
    .description('Show user details')
    .action(async (id: string) => {
      try {
        const api = await createApiClient()
        await showAction(api, id)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })
}
