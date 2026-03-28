import type { Command } from 'commander'
import type { ApiClient } from '../services/api.js'
import { createApiClient } from '../services/api.js'
import { formatMeetingList, formatMeetingDetail } from '../formatters.js'
import pc from 'picocolors'

export async function listAction(api: ApiClient, opts: { status?: string; date?: string; json?: boolean }) {
  const params: Record<string, string> = {}
  if (opts.status) params.status = opts.status
  if (opts.date) params.date = opts.date
  const result = await api.listMeetings(Object.keys(params).length > 0 ? params : undefined)
  if (opts.json) {
    console.log(JSON.stringify(result.data, null, 2))
  } else {
    console.log(formatMeetingList(result.data))
  }
}

export async function showAction(api: ApiClient, id: string) {
  const result = await api.getMeeting(id)
  console.log(formatMeetingDetail(result.data))
}

function calculateEndTime(startTime: string, durationMinutes: string): string {
  const start = new Date(startTime)
  const end = new Date(start.getTime() + Number(durationMinutes) * 60 * 1000)
  return end.toISOString()
}

export async function createAction(api: ApiClient, opts: {
  title: string
  start: string
  end?: string
  duration?: string
  room: string
  participants?: string
  description?: string
  agenda?: string
  recurrence?: string
}) {
  if (!opts.end && !opts.duration) {
    throw new Error('Must provide either --end <datetime> or --duration <minutes>')
  }
  const endTime = opts.end || calculateEndTime(opts.start, opts.duration!)
  const participantIds = opts.participants ? opts.participants.split(',').map((s) => s.trim()).filter(Boolean) : []

  const result = await api.createMeeting({
    title: opts.title,
    startTime: opts.start,
    endTime,
    roomId: opts.room,
    participantIds,
    description: opts.description,
    agenda: opts.agenda,
    recurrence: opts.recurrence,
  })

  console.log(pc.green(`Meeting created: ${result.data.id}`))
  console.log(`  Title:  ${opts.title}`)
  console.log(`  Start:  ${new Date(opts.start).toLocaleString()}`)
  console.log(`  End:    ${new Date(endTime).toLocaleString()}`)
  if (participantIds.length > 0) console.log(`  Participants: ${participantIds.length}`)
}

export async function updateAction(api: ApiClient, id: string, opts: Record<string, string | undefined>) {
  const body: Record<string, unknown> = {}
  if (opts.title) body.title = opts.title
  if (opts.description) body.description = opts.description
  if (opts.agenda) body.agenda = opts.agenda
  if (opts.room) body.roomId = opts.room
  if (opts.recurrence) body.recurrence = opts.recurrence
  if (opts.participants) body.participantIds = opts.participants.split(',').map((s) => s.trim()).filter(Boolean)

  if (opts.start) {
    body.startTime = opts.start
    if (opts.duration) {
      body.endTime = calculateEndTime(opts.start, opts.duration)
    } else if (opts.end) {
      body.endTime = opts.end
    }
  } else if (opts.end) {
    body.endTime = opts.end
  }

  const result = await api.updateMeeting(id, body)
  console.log(pc.green(`Meeting updated: ${result.data.title}`))
}

export async function cancelAction(api: ApiClient, id: string) {
  const result = await api.cancelMeeting(id)
  console.log(pc.yellow(`Meeting cancelled: ${result.data.title} (${result.data.id})`))
}

export async function confirmAction(api: ApiClient, id: string) {
  const result = await api.confirmMeeting(id)
  console.log(pc.green(`Meeting confirmed: ${result.data.meetingId} (status: ${result.data.status})`))
}

export function registerMeetingCommand(program: Command) {
  const meeting = program.command('meeting').alias('m').description('Manage meetings')

  meeting
    .command('list')
    .description('List meetings')
    .option('--status <status>', 'Filter by status (scheduled/cancelled/completed)')
    .option('--date <date>', 'Filter by date (e.g. 2024-01-15)')
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

  meeting
    .command('show <id>')
    .description('Show meeting details')
    .action(async (id: string) => {
      try {
        const api = await createApiClient()
        await showAction(api, id)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })

  meeting
    .command('create')
    .description('Create a new meeting')
    .requiredOption('--title <title>', 'Meeting title')
    .requiredOption('--start <datetime>', 'Start time (ISO 8601)')
    .option('--end <datetime>', 'End time (ISO 8601)')
    .option('--duration <minutes>', 'Duration in minutes (alternative to --end)')
    .requiredOption('--room <roomId>', 'Room ID')
    .option('--participants <ids>', 'Comma-separated participant IDs')
    .option('--description <text>', 'Description')
    .option('--agenda <text>', 'Agenda')
    .option('--recurrence <type>', 'Recurrence (none/daily/weekly/monthly)')
    .action(async (opts) => {
      try {
        const api = await createApiClient()
        await createAction(api, opts)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })

  meeting
    .command('update <id>')
    .description('Update a meeting')
    .option('--title <title>', 'Title')
    .option('--start <datetime>', 'Start time')
    .option('--end <datetime>', 'End time')
    .option('--duration <minutes>', 'Duration in minutes (used with --start)')
    .option('--room <roomId>', 'Room ID')
    .option('--participants <ids>', 'Comma-separated participant IDs (replaces all)')
    .option('--description <text>', 'Description')
    .option('--agenda <text>', 'Agenda')
    .option('--recurrence <type>', 'Recurrence (none/daily/weekly/monthly)')
    .action(async (id: string, opts: Record<string, string>) => {
      try {
        const api = await createApiClient()
        await updateAction(api, id, opts)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })

  meeting
    .command('cancel <id>')
    .description('Cancel a meeting')
    .action(async (id: string) => {
      try {
        const api = await createApiClient()
        await cancelAction(api, id)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })

  meeting
    .command('confirm <id>')
    .description('Confirm attendance')
    .action(async (id: string) => {
      try {
        const api = await createApiClient()
        await confirmAction(api, id)
      } catch (err) {
        console.error(pc.red(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`))
        process.exit(1)
      }
    })
}
