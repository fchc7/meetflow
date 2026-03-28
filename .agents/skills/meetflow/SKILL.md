---
name: meetflow
description: MeetFlow project architecture guide, coding conventions, TDD workflow, and sub-package responsibilities. Load this skill before making any changes to the MeetFlow codebase to understand the monorepo structure, data models, API design, and development priorities.
user-invocable: true
---

# MeetFlow — Project Architecture & Development Guide

## Overview

MeetFlow is a **meeting management system** (会议管理系统) built as a pnpm monorepo. The primary sub-feature is **meeting booking/reservation** with time conflict detection, recurring meetings, and role-based access control.

**Tech stack**: React + shadcn/ui + Tailwind | Hono + Drizzle ORM + SQLite | Commander.js | TypeScript + Zod

**Development priorities**: shared → server → web → cli (CLI is lowest priority)

---

## Monorepo Structure

```
meetflow/
├── packages/
│   ├── shared/     # Zod schemas, TypeScript types, utility functions
│   ├── server/     # Hono API server, Drizzle ORM, SQLite database
│   ├── web/        # React SPA + PWA, shadcn/ui, Tailwind CSS
│   └── cli/        # Commander.js CLI tool (lowest priority)
├── .agents/skills/ # opencode skills (UI/design skills already installed)
├── package.json    # monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Package Responsibilities

### 1. `packages/shared` — Shared Types & Validation

**Purpose**: Single source of truth for data models, validation rules, and pure utility functions. Consumed by server, web, and cli.

**Exports**:

- **Zod schemas** (`src/schemas/`): `meetingSchema`, `createMeetingSchema`, `roomSchema`, `userSchema` — runtime validation and TypeScript type inference
- **TypeScript interfaces** (`src/types/`): `MeetingParticipant`, `Notification`, `Attachment`
- **Utilities** (`src/utils/`): `hasTimeConflict()` — pure function for time overlap detection

**Key types**:

- `Meeting`: id, title, description, agenda, startTime, endTime, roomId, hostId, recurrence (none/daily/weekly/monthly), status (scheduled/cancelled/completed)
- `Room`: id, name, location, capacity, equipment[]
- `User`: id, name, email, role (admin/host/participant)
- `CreateMeetingInput`: title, description, agenda, startTime, endTime, roomId, recurrence, participantIds[]

**Rules**:

- No runtime dependencies except `zod`
- All exported types derive from Zod schemas (`z.infer<>`)
- Pure functions only — no I/O, no side effects
- This package MUST have the highest test coverage (utility functions + schema validation)

### 2. `packages/server` — Backend API

**Purpose**: RESTful API server serving the web frontend and CLI tool.

**Stack**: Hono (HTTP framework) + Drizzle ORM + better-sqlite3

**Database schema** (`src/db/schema.ts`):
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, name, email, passwordHash, role |
| `rooms` | Meeting rooms | id, name, location, capacity, equipment (JSON) |
| `meetings` | Meeting records | id, title, startTime, endTime, roomId, hostId, recurrence, status |
| `meeting_participants` | Junction table | meetingId, userId, status (pending/confirmed/declined) |
| `notifications` | User notifications | id, userId, meetingId, type (reminder/change/cancel), message, read |
| `attachments` | Meeting files | id, meetingId, fileName, fileSize, url |

**API routes** (`src/routes/`):

- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login, returns JWT
- `GET/POST /api/meetings` — List/create meetings
- `GET/PATCH/DELETE /api/meetings/:id` — Get/update/cancel meeting
- `GET/POST /api/rooms` — List/create rooms
- `GET /api/rooms/:id` — Get room detail
- `GET/PATCH /api/users/:id` — Get/update user

**Middleware** (`src/middleware/auth.ts`): JWT auth for protected routes

**Rules**:

- All request/response validation uses shared Zod schemas
- Use Drizzle ORM for all database operations (no raw SQL)
- JWT tokens for authentication, bcrypt for password hashing
- Return proper HTTP status codes and error messages
- Entry point: `src/index.ts` exports Hono app

### 3. `packages/web` — Frontend SPA + PWA

**Purpose**: User-facing web application for managing meetings.

**Stack**: React 18 + Vite + shadcn/ui + Tailwind CSS + vite-plugin-pwa

**Configuration**:

- Path alias: `@/` → `src/`
- API proxy: `/api` → `http://localhost:3000` (dev)
- PWA: auto-update, NetworkFirst caching for API calls
- shadcn/ui CSS variables defined in `src/styles/globals.css` (light + dark themes)

**Directory structure** (to be built):

```
src/
├── components/    # Reusable UI components (shadcn/ui pattern)
│   ├── ui/        # Base shadcn components
│   └── ...        # Domain-specific components
├── pages/         # Route-level page components
├── hooks/         # Custom React hooks
├── services/      # API client functions
├── stores/        # State management
├── styles/        # Global CSS, theme variables
└── lib/           # Utilities (cn() already exists)
```

**Rules**:

- Use shadcn/ui components — do NOT install other UI libraries
- Follow shadcn/ui patterns: `cn()` for class merging, CSS variables for theming
- React Testing Library for unit tests, Playwright for E2E
- All API calls go through `/api` proxy (same-origin in production)

### 4. `packages/cli` — Command Line Tool (LOWEST PRIORITY)

**Purpose**: Terminal-based interface for meeting management. Built last.

**Stack**: Commander.js

**Commands**: `meetflow config`, `meetflow meeting list/show/create/update/cancel/confirm`, `meetflow room list/show`

**Config**: Reads/writes `~/.meetflowrc` for API endpoint and auth token.

**Rules**:

- Calls remote API directly via HTTP (no local database)
- Config file stores API URL and JWT token
- Build only after server API is stable

---

## Testing Strategy (TDD Required)

### Principle: Test-Driven Development

1. **Write tests FIRST** for every feature
2. Run tests to see them fail (red)
3. Implement minimum code to pass (green)
4. Refactor while keeping tests green

### Test Coverage Requirements

- `shared`: **>90%** — schemas, types, utility functions
- `server`: **>80%** — route handlers, middleware, database operations
- `web`: **>70%** — component rendering, user interactions, API integration
- `cli`: **>60%** — command parsing, output formatting

### Testing Tools

| Package | Unit Tests                     | Integration                       | E2E        |
| ------- | ------------------------------ | --------------------------------- | ---------- |
| shared  | Vitest                         | —                                 | —          |
| server  | Vitest                         | Vitest + better-sqlite3 in-memory | —          |
| web     | Vitest + React Testing Library | MSW for API mocking               | Playwright |
| cli     | Vitest                         | —                                 | —          |

### Test File Conventions

- Test files: `*.test.ts` or `*.test.tsx` colocated with source or in `__tests__/`
- Each `packages/*/vitest.config.ts` is already configured
- Use `describe/it` blocks, descriptive test names
- Mock external dependencies (database, HTTP, file system)

---

## Development Workflow

### Phase 1: Shared Package (Foundation)

1. Write tests for `hasTimeConflict()` utility
2. Write tests for Zod schema validation (valid/invalid inputs)
3. Ensure all exports are correct and types are inferred properly

### Phase 2: Server (API)

1. Write tests for database schema and CRUD operations
2. Write tests for route handlers (request validation, response format)
3. Write tests for auth middleware (JWT validation, role checking)
4. Implement routes to pass tests
5. Test time conflict detection integration

### Phase 3: Web (Frontend)

1. Write tests for page components (render, user interactions)
2. Write tests for API service layer
3. Write tests for custom hooks
4. Implement UI to pass tests
5. Add E2E tests with Playwright for critical flows

### Phase 4: CLI (Last)

1. Write tests for command parsing
2. Write tests for API client service
3. Implement commands to pass tests

---

## Code Conventions

### TypeScript

- Strict mode enabled (`tsconfig.base.json`)
- Use `import type` for type-only imports
- ESM modules with `.js` extension in imports (TypeScript ESM convention)
- No `any` types — use `unknown` and narrow

### Naming

- Files: `kebab-case.ts` (e.g., `time-conflict.ts`)
- Components: `PascalCase.tsx` (e.g., `MeetingCard.tsx`)
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Zod schemas: `xxxSchema` (e.g., `meetingSchema`)
- Types: `PascalCase` (e.g., `Meeting`, `CreateMeetingInput`)

### API Conventions

- RESTful resource naming: plural nouns (`/api/meetings`, `/api/rooms`)
- Consistent response envelope: `{ data: ..., error?: ... }`
- Pagination: `?page=1&limit=20`
- Filter/query: `?status=scheduled&date=2024-01-15`

### Database Conventions

- Primary keys: `text` UUID strings
- Timestamps: ISO 8601 strings stored as `text`
- JSON columns: use Drizzle's `mode: 'json'`
- Foreign keys: always reference with `references(() => table.id)`

---

## Key Dependencies

### shared

- `zod` — Schema validation and type inference

### server

- `hono` — HTTP framework (lightweight, TypeScript-native)
- `drizzle-orm` — Type-safe ORM
- `better-sqlite3` — SQLite driver
- `jsonwebtoken` — JWT generation/verification
- `bcryptjs` — Password hashing

### web

- `react`, `react-dom` — UI framework
- `vite`, `@vitejs/plugin-react` — Build tool
- `tailwindcss` — Utility-first CSS
- `vite-plugin-pwa` — PWA support
- shadcn/ui components (manually added, not npm package)

### cli

- `commander` — CLI framework
- (uses native `fetch` for HTTP)

---

## Important Reminders

- **Always run tests after changes**: `pnpm --filter <package> test`
- **Check types**: `pnpm --filter <package> typecheck` (if configured)
- **Database migrations**: Use `drizzle-kit` for schema migrations
- **Do NOT start CLI development** until server and web are stable
- **Load this skill** before starting any development work on MeetFlow
- **Write tests first** — red, green, refactor
