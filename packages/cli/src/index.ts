#!/usr/bin/env node
import { Command } from 'commander'
import { registerConfigCommand } from './commands/config.js'
import { registerAuthCommand } from './commands/auth.js'
import { registerMeetingCommand } from './commands/meeting.js'
import { registerRoomCommand } from './commands/room.js'
import { registerUserCommand } from './commands/user.js'
import { registerNotificationCommand } from './commands/notification.js'

const program = new Command()

program
  .name('meetflow')
  .description('MeetFlow CLI - Meeting management from the terminal')
  .version('0.0.1')

registerConfigCommand(program)
registerAuthCommand(program)
registerMeetingCommand(program)
registerRoomCommand(program)
registerUserCommand(program)
registerNotificationCommand(program)

program.parse()
