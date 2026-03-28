---
name: meetflow-cli
description: >
  MeetFlow CLI command reference and usage guide. Provides the full command catalog,
  parameters, and examples for managing meetings, rooms, users, and notifications via terminal.
  Load this skill when:
  - The user asks to perform CRUD operations on meetings/rooms/users/notifications (e.g. "帮我创建一个会议", "查一下明天的会议", "取消站会")
  - The user asks how to use meetflow CLI or what commands are available
  - Working in OpenClaw, CI/CD, or any environment without web UI where CLI is the primary interface
  - The user needs to automate meeting management tasks via shell commands
  Do NOT load for code-level development questions (use the "meetflow" skill instead for architecture and coding conventions).
user-invocable: true
---

# MeetFlow CLI — Command Reference

MeetFlow CLI is a terminal tool for managing meetings, rooms, users, and notifications via the MeetFlow REST API. Designed for use in OpenClaw, CI/CD, and automated workflows.

## Quick Start

```bash
# Run via pnpm
pnpm --filter @meetflow/cli dev -- <command>

# Or directly with tsx
npx tsx packages/cli/src/index.ts <command>
```

## Configuration

### Initial Setup

```bash
# Set server URL (default: http://localhost:3000)
meetflow config --server http://your-server:3000

# Set auth token manually
meetflow config --token <jwt-token>
```

Config is stored in `~/.meetflowrc` as JSON: `{ "server": "...", "token": "..." }`

### Default Test Accounts

| Role | Email | Password |
|------|-------|----------|
| admin | admin@meetflow.com | admin123 |
| host | host@meetflow.com | host123 |
| participant | user@meetflow.com | user123 |

---

## Command Reference

### auth (alias: a)

Authentication — login and register. Token auto-saves to config.

```bash
# Login
meetflow auth login --email <email> --password <password>

# Register
meetflow auth register --name <name> --email <email> --password <password>
```

---

### meeting (alias: m)

Full meeting lifecycle management.

#### list

```bash
meetflow meeting list
meetflow meeting list --status scheduled
meetflow meeting list --date 2024-01-15
meetflow meeting list --status scheduled --date 2024-01-15
meetflow meeting list --json
```

| Option | Description |
|--------|-------------|
| `--status <status>` | Filter: `scheduled` / `cancelled` / `completed` |
| `--date <date>` | Filter by date (e.g. `2024-01-15`) |
| `--json` | Output raw JSON |

#### show

```bash
meetflow meeting show <meeting-id>
```

Displays: title, status, time, recurrence, description, agenda, room info, participant list with confirmation status.

#### create

```bash
meetflow meeting create \
  --title "Meeting Title" \
  --start "2024-01-15T09:00:00Z" \
  --duration 30 \
  --room <room-id> \
  --participants "user-id-1,user-id-2" \
  --description "Optional description" \
  --agenda "Optional agenda" \
  --recurrence weekly
```

| Option | Required | Description |
|--------|----------|-------------|
| `--title <title>` | Yes | Meeting title |
| `--start <datetime>` | Yes | Start time (ISO 8601) |
| `--end <datetime>` | No* | End time (ISO 8601). *Must provide `--end` OR `--duration` |
| `--duration <minutes>` | No* | Duration in minutes. Alternative to `--end` |
| `--room <roomId>` | Yes | Room UUID |
| `--participants <ids>` | No | Comma-separated participant user IDs |
| `--description <text>` | No | Meeting description |
| `--agenda <text>` | No | Meeting agenda |
| `--recurrence <type>` | No | `none` (default) / `daily` / `weekly` / `monthly` |

#### update

```bash
meetflow meeting update <meeting-id> --title "New Title"
meetflow meeting update <meeting-id> --start "2024-01-16T10:00:00Z" --duration 45
meetflow meeting update <meeting-id> --participants "u1,u2,u3"
meetflow meeting update <meeting-id> --room <new-room-id> --status completed
```

All options from `create` are optional. Only provided fields are updated. `--participants` replaces the entire participant list.

#### cancel

```bash
meetflow meeting cancel <meeting-id>
```

Soft-deletes meeting (status → `cancelled`). Only host or admin can cancel.

#### confirm

```bash
meetflow meeting confirm <meeting-id>
```

Confirms attendance as a participant.

---

### room (alias: r)

Meeting room management.

#### list

```bash
meetflow room list
meetflow room list --available --date 2024-01-15
meetflow room list --json
```

| Option | Description |
|--------|-------------|
| `--available` | Only show rooms available on the given `--date` |
| `--date <date>` | Date to check availability |
| `--json` | Output raw JSON |

#### show

```bash
meetflow room show <room-id>
```

Displays: name, location, capacity, equipment list.

#### create

```bash
meetflow room create --name "Room Name" --capacity 20 --location "Floor 3"
```

| Option | Required | Description |
|--------|----------|-------------|
| `--name <name>` | Yes | Room name |
| `--capacity <number>` | Yes | Maximum capacity |
| `--location <location>` | No | Location description |

---

### user (alias: u)

User information lookup.

#### list

```bash
meetflow user list
meetflow user list --json
```

#### show

```bash
meetflow user show <user-id>
```

---

### notification (alias: n)

Notification management.

#### list

```bash
meetflow notification list
meetflow notification list --unread
meetflow notification list --read
meetflow notification list --json
```

| Option | Description |
|--------|-------------|
| `--read` | Show only read notifications |
| `--unread` | Show only unread notifications |
| `--json` | Output raw JSON |

#### read

```bash
meetflow notification read <notification-id>
```

---

### config

Manage CLI configuration stored in `~/.meetflowrc`.

```bash
meetflow config --server http://localhost:3000
meetflow config --token <jwt-token>
```

---

## Command Quick Reference

| Command | Alias | Action | Auth Required |
|---------|-------|--------|---------------|
| `auth login` | `a login` | Login and save token | No |
| `auth register` | `a register` | Register new account | No |
| `meeting list` | `m list` | List meetings | No* |
| `meeting show <id>` | `m show` | Meeting detail | No* |
| `meeting create` | `m create` | Create meeting | Yes |
| `meeting update <id>` | `m update` | Update meeting | Yes (host/admin) |
| `meeting cancel <id>` | `m cancel` | Cancel meeting | Yes (host/admin) |
| `meeting confirm <id>` | `m confirm` | Confirm attendance | Yes (participant) |
| `room list` | `r list` | List rooms | No |
| `room show <id>` | `r show` | Room detail | No |
| `room create` | `r create` | Create room | Yes |
| `user list` | `u list` | List users | Yes |
| `user show <id>` | `u show` | User detail | Yes |
| `notification list` | `n list` | List notifications | Yes |
| `notification read <id>` | `n read` | Mark as read | Yes |
| `config` | — | Set server/token | No |

*Meeting list/show are public endpoints but may return limited data without auth.

---

## Architecture

```
packages/cli/src/
├── index.ts              # Entry point, registers all commands
├── formatters.ts         # Terminal table/detail output formatting (picocolors)
├── services/
│   ├── api.ts            # ApiClient class (22 methods, all endpoints)
│   └── config.ts         # ~/.meetflowrc read/write
└── commands/
    ├── auth.ts           # login, register
    ├── meeting.ts        # list, show, create, update, cancel, confirm
    ├── room.ts           # list, show, create
    ├── user.ts           # list, show
    ├── notification.ts   # list, read
    └── config.ts         # server/token config
```

Each command module exports:
- `xxxAction(api, opts)` — Pure action function (testable, no Commander dependency)
- `registerXxxCommand(program)` — Registers Commander subcommands

## Testing

```bash
pnpm --filter @meetflow/cli test          # Run all CLI tests
pnpm --filter @meetflow/cli test:watch    # Watch mode
pnpm --filter @meetflow/cli typecheck     # Type check
```

7 test files, 64 test cases. Tests mock `fetch` globally and verify API calls + output formatting.
