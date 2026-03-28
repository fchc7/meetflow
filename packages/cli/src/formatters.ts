import pc from 'picocolors'
import type { MeetingListItem, MeetingDetail, RoomListItem, UserListItem, NotificationListItem } from './services/api.js'

function truncate(str: string, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function formatStatus(status: string): string {
  switch (status) {
    case 'scheduled': return pc.green(status)
    case 'cancelled': return pc.red(status)
    case 'completed': return pc.dim(status)
    default: return status
  }
}

function formatRole(role: string): string {
  switch (role) {
    case 'admin': return pc.magenta(role)
    case 'host': return pc.cyan(role)
    case 'participant': return pc.dim(role)
    default: return role
  }
}

export function formatMeetingList(meetings: MeetingListItem[]): string {
  if (meetings.length === 0) return pc.dim('No meetings found.')

  const idW = 10
  const titleW = 30
  const startW = 22
  const endW = 22

  const lines: string[] = []
  lines.push(
    pc.bold(
      truncate('ID', idW).padEnd(idW) + '  ' +
      truncate('Title', titleW).padEnd(titleW) + '  ' +
      truncate('Start', startW).padEnd(startW) + '  ' +
      truncate('End', endW).padEnd(endW) + '  ' +
      'Status',
    ),
  )
  lines.push(pc.dim('─'.repeat(idW + titleW + startW + endW + 10 + 8)))

  for (const m of meetings) {
    lines.push(
      truncate(m.id, idW).padEnd(idW) + '  ' +
      truncate(m.title, titleW).padEnd(titleW) + '  ' +
      truncate(formatDate(m.startTime), startW).padEnd(startW) + '  ' +
      truncate(formatDate(m.endTime), endW).padEnd(endW) + '  ' +
      formatStatus(m.status),
    )
  }

  return lines.join('\n')
}

export function formatMeetingDetail(m: MeetingDetail): string {
  const lines: string[] = []
  lines.push(pc.bold(`Meeting: ${m.title}`))
  lines.push(pc.dim('─'.repeat(50)))
  lines.push(`  ID:          ${m.id}`)
  lines.push(`  Status:      ${formatStatus(m.status)}`)
  lines.push(`  Start:       ${formatDate(m.startTime)}`)
  lines.push(`  End:         ${formatDate(m.endTime)}`)
  lines.push(`  Recurrence:  ${m.recurrence}`)
  if (m.description) lines.push(`  Description: ${m.description}`)
  if (m.agenda) lines.push(`  Agenda:      ${m.agenda}`)
  if (m.room) {
    lines.push('')
    lines.push(pc.bold('  Room'))
    lines.push(`    Name:       ${m.room.name}`)
    if (m.room.location) lines.push(`    Location:   ${m.room.location}`)
    lines.push(`    Capacity:   ${m.room.capacity}`)
    if (m.room.equipment?.length > 0) lines.push(`    Equipment:  ${m.room.equipment.join(', ')}`)
  }
  if (m.participants?.length > 0) {
    lines.push('')
    lines.push(pc.bold('  Participants'))
    for (const p of m.participants) {
      const statusStr = p.status === 'confirmed' ? pc.green('✓') : p.status === 'declined' ? pc.red('✗') : pc.yellow('○')
      lines.push(`    ${statusStr} ${p.name} (${p.email}) - ${p.status}`)
    }
  }
  return lines.join('\n')
}

export function formatRoomList(rooms: RoomListItem[]): string {
  if (rooms.length === 0) return pc.dim('No rooms found.')

  const idW = 10
  const nameW = 20
  const locW = 20

  const lines: string[] = []
  lines.push(
    pc.bold(
      truncate('ID', idW).padEnd(idW) + '  ' +
      truncate('Name', nameW).padEnd(nameW) + '  ' +
      truncate('Location', locW).padEnd(locW) + '  ' +
      'Capacity',
    ),
  )
  lines.push(pc.dim('─'.repeat(idW + nameW + locW + 12 + 6)))

  for (const r of rooms) {
    lines.push(
      truncate(r.id, idW).padEnd(idW) + '  ' +
      truncate(r.name, nameW).padEnd(nameW) + '  ' +
      truncate(r.location || '-', locW).padEnd(locW) + '  ' +
      String(r.capacity),
    )
  }

  return lines.join('\n')
}

export function formatRoomDetail(r: RoomListItem): string {
  const lines: string[] = []
  lines.push(pc.bold(`Room: ${r.name}`))
  lines.push(pc.dim('─'.repeat(40)))
  lines.push(`  ID:        ${r.id}`)
  if (r.location) lines.push(`  Location:  ${r.location}`)
  lines.push(`  Capacity:  ${r.capacity}`)
  if (r.equipment?.length > 0) lines.push(`  Equipment: ${r.equipment.join(', ')}`)
  return lines.join('\n')
}

export function formatUserList(users: UserListItem[]): string {
  if (users.length === 0) return pc.dim('No users found.')

  const idW = 10
  const nameW = 20
  const emailW = 25

  const lines: string[] = []
  lines.push(
    pc.bold(
      truncate('ID', idW).padEnd(idW) + '  ' +
      truncate('Name', nameW).padEnd(nameW) + '  ' +
      truncate('Email', emailW).padEnd(emailW) + '  ' +
      'Role',
    ),
  )
  lines.push(pc.dim('─'.repeat(idW + nameW + emailW + 8 + 6)))

  for (const u of users) {
    lines.push(
      truncate(u.id, idW).padEnd(idW) + '  ' +
      truncate(u.name, nameW).padEnd(nameW) + '  ' +
      truncate(u.email, emailW).padEnd(emailW) + '  ' +
      formatRole(u.role),
    )
  }

  return lines.join('\n')
}

export function formatNotificationList(notifications: NotificationListItem[]): string {
  if (notifications.length === 0) return pc.dim('No notifications found.')

  const idW = 10
  const typeW = 10
  const msgW = 40

  const lines: string[] = []
  lines.push(
    pc.bold(
      truncate('ID', idW).padEnd(idW) + '  ' +
      truncate('Type', typeW).padEnd(typeW) + '  ' +
      truncate('Message', msgW).padEnd(msgW) + '  ' +
      'Read',
    ),
  )
  lines.push(pc.dim('─'.repeat(idW + typeW + msgW + 8 + 6)))

  for (const n of notifications) {
    const readStr = n.read ? pc.green('✓') : pc.yellow('○')
    lines.push(
      truncate(n.id, idW).padEnd(idW) + '  ' +
      truncate(n.type, typeW).padEnd(typeW) + '  ' +
      truncate(n.message, msgW).padEnd(msgW) + '  ' +
      readStr,
    )
  }

  return lines.join('\n')
}
