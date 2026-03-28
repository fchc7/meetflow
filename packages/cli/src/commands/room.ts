import type { Command } from 'commander'

export function registerRoomCommand(program: Command) {
  const room = program.command('room').alias('r').description('Manage rooms')

  room
    .command('list')
    .description('List all rooms')
    .option('--available', 'Only show available rooms')
    .option('--date <date>', 'Date to check availability')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      console.log('list rooms', opts)
    })

  room
    .command('show <id>')
    .description('Show room details')
    .action(async (id) => {
      console.log('show room', id)
    })
}
