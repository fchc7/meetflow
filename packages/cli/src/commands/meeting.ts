import type { Command } from 'commander'

export function registerMeetingCommand(program: Command) {
  const meeting = program.command('meeting').alias('m').description('Manage meetings')

  meeting
    .command('list')
    .description('List your meetings')
    .option('--date <date>', 'Filter by date')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      console.log('list meetings', opts)
    })

  meeting
    .command('show <id>')
    .description('Show meeting details')
    .action(async (id) => {
      console.log('show meeting', id)
    })

  meeting
    .command('create')
    .description('Create a new meeting')
    .option('--title <title>', 'Meeting title')
    .option('--time <datetime>', 'Start time (ISO 8601)')
    .option('--duration <minutes>', 'Duration in minutes')
    .option('--room <roomId>', 'Room ID')
    .option('--participants <ids>', 'Comma-separated participant IDs')
    .action(async (opts) => {
      console.log('create meeting', opts)
    })

  meeting
    .command('update <id>')
    .description('Update a meeting')
    .action(async (id) => {
      console.log('update meeting', id)
    })

  meeting
    .command('cancel <id>')
    .description('Cancel a meeting')
    .action(async (id) => {
      console.log('cancel meeting', id)
    })

  meeting
    .command('confirm <id>')
    .description('Confirm attendance')
    .action(async (id) => {
      console.log('confirm meeting', id)
    })
}
