import type { Command } from 'commander'
import type { ApiClient } from '../services/api.js'
import { createApiClient } from '../services/api.js'
import { formatNotificationList } from '../formatters.js'
import pc from 'picocolors'

export async function listAction(api: ApiClient, opts: { read?: boolean; json?: boolean }) {
  const params: Record<string, string> = {}
  if (opts.read !== undefined) params.read = String(opts.read)
  const result = await api.listNotifications(Object.keys(params).length > 0 ? params : undefined)
  if (opts.json) {
    console.log(JSON.stringify(result.data, null, 2))
  } else {
    console.log(formatNotificationList(result.data))
  }
}

export async function readAction(api: ApiClient, id: string) {
  const result = await api.markNotificationRead(id)
  console.log(pc.green(`Notification marked as read: ${result.data.id}`))
}

export function registerNotificationCommand(program: Command) {
  const notif = program.command('notification').alias('n').description('Manage notifications')

  notif
    .command('list')
    .description('List notifications')
    .option('--read', 'Only show read notifications')
    .option('--unread', 'Only show unread notifications')
    .option('--json', 'Output as JSON')
    .action(async (opts: { read?: boolean; unread?: boolean; json?: boolean }) => {
      try {
        const api = await createApiClient()
        const filterOpts: { read?: boolean; json?: boolean } = { json: opts.json }
        if (opts.unread) filterOpts.read = false
        else if (opts.read) filterOpts.read = true
        await listAction(api, filterOpts)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })

  notif
    .command('read <id>')
    .description('Mark notification as read')
    .action(async (id: string) => {
      try {
        const api = await createApiClient()
        await readAction(api, id)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })
}
