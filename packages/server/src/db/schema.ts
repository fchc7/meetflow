import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'host', 'participant'] }).notNull().default('participant'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  capacity: integer('capacity').notNull(),
  equipment: text('equipment', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const meetings = sqliteTable('meetings', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  agenda: text('agenda'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  hostId: text('host_id').notNull().references(() => users.id),
  recurrence: text('recurrence', { enum: ['none', 'daily', 'weekly', 'monthly'] }).notNull().default('none'),
  status: text('status', { enum: ['scheduled', 'cancelled', 'completed'] }).notNull().default('scheduled'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const meetingParticipants = sqliteTable('meeting_participants', {
  meetingId: text('meeting_id').notNull().references(() => meetings.id),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status', { enum: ['pending', 'confirmed', 'declined'] }).notNull().default('pending'),
})

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  meetingId: text('meeting_id').notNull().references(() => meetings.id),
  type: text('type', { enum: ['reminder', 'change', 'cancel'] }).notNull(),
  message: text('message').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  url: text('url').notNull(),
  uploadedAt: text('uploaded_at').notNull().$defaultFn(() => new Date().toISOString()),
})
