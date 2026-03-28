#!/usr/bin/env node
import { Command } from 'commander'
import { registerConfigCommand } from './commands/config.js'
import { registerMeetingCommand } from './commands/meeting.js'
import { registerRoomCommand } from './commands/room.js'

const program = new Command()

program
  .name('meetflow')
  .description('MeetFlow CLI - Meeting management from the terminal')
  .version('0.0.1')

registerConfigCommand(program)
registerMeetingCommand(program)
registerRoomCommand(program)

program.parse()
