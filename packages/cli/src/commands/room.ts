import type { Command } from 'commander'
import type { ApiClient } from '../services/api.js'
import { createApiClient } from '../services/api.js'
import { formatRoomList, formatRoomDetail } from '../formatters.js'
import pc from 'picocolors'

export async function listAction(api: ApiClient, opts: { available?: boolean; date?: string; json?: boolean }) {
  const params: Record<string, string> = {}
  if (opts.available) params.available = 'true'
  if (opts.date) params.date = opts.date
  const result = await api.listRooms(Object.keys(params).length > 0 ? params : undefined)
  if (opts.json) {
    console.log(JSON.stringify(result.data, null, 2))
  } else {
    console.log(formatRoomList(result.data))
  }
}

export async function showAction(api: ApiClient, id: string) {
  const result = await api.getRoom(id)
  console.log(formatRoomDetail(result.data))
}

export async function createAction(api: ApiClient, opts: { name: string; capacity: string; location?: string }) {
  const result = await api.createRoom({
    name: opts.name,
    capacity: Number(opts.capacity),
    location: opts.location,
    equipment: [],
  })
  console.log(pc.green(`Room created: ${result.data.name} (${result.data.id})`))
  console.log(`  Capacity:  ${result.data.capacity}`)
  if (result.data.location) console.log(`  Location:  ${result.data.location}`)
}

export function registerRoomCommand(program: Command) {
  const room = program.command('room').alias('r').description('Manage rooms')

  room
    .command('list')
    .description('List all rooms')
    .option('--available', 'Only show available rooms')
    .option('--date <date>', 'Date to check availability')
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

  room
    .command('show <id>')
    .description('Show room details')
    .action(async (id: string) => {
      try {
        const api = await createApiClient()
        await showAction(api, id)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })

  room
    .command('create')
    .description('Create a new room')
    .requiredOption('--name <name>', 'Room name')
    .requiredOption('--capacity <number>', 'Room capacity')
    .option('--location <location>', 'Room location')
    .action(async (opts) => {
      try {
        const api = await createApiClient()
        await createAction(api, opts)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })
}
