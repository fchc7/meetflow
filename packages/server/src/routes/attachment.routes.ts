import crypto from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema.js'
import { db } from '../db/index.js'
import { authMiddleware } from '../middleware/auth.js'

type Env = { Variables: { userId: string; userRole: string } }

function getAttachmentsDirectory() {
  if (process.env.ATTACHMENTS_DIR) {
    return process.env.ATTACHMENTS_DIR
  }

  const currentDir = dirname(fileURLToPath(import.meta.url))
  return resolve(currentDir, '../../uploads')
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
}

function resolveStoredFilePath(attachmentId: string, fileName: string) {
  return join(getAttachmentsDirectory(), `${attachmentId}-${sanitizeFileName(fileName)}`)
}

function formatDownloadName(fileName: string) {
  return fileName.replace(/"/g, '\\"')
}

function getMeeting(targetDb: BetterSQLite3Database<typeof schema>, meetingId: string) {
  return targetDb.select()
    .from(schema.meetings)
    .where(eq(schema.meetings.id, meetingId))
    .get()
}

function canReadMeeting(
  targetDb: BetterSQLite3Database<typeof schema>,
  meetingId: string,
  userId: string,
  userRole: string,
) {
  if (userRole === 'admin') {
    return true
  }

  const meeting = getMeeting(targetDb, meetingId)
  if (!meeting) {
    return false
  }

  if (meeting.hostId === userId) {
    return true
  }

  return Boolean(
    targetDb.select()
      .from(schema.meetingParticipants)
      .where(and(
        eq(schema.meetingParticipants.meetingId, meetingId),
        eq(schema.meetingParticipants.userId, userId),
      ))
      .get(),
  )
}

function canManageMeeting(
  targetDb: BetterSQLite3Database<typeof schema>,
  meetingId: string,
  userId: string,
  userRole: string,
) {
  if (userRole === 'admin') {
    return true
  }

  const meeting = getMeeting(targetDb, meetingId)
  return Boolean(meeting && meeting.hostId === userId)
}

export function createAttachmentRoutes(targetDb: BetterSQLite3Database<typeof schema>) {
  const router = new Hono<Env>()

  router.use('*', authMiddleware)

  router.get('/meetings/:meetingId/attachments', (c) => {
    const meetingId = c.req.param('meetingId')
    const meeting = getMeeting(targetDb, meetingId)

    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    if (!canReadMeeting(targetDb, meetingId, c.get('userId'), c.get('userRole'))) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const data = targetDb.select()
      .from(schema.attachments)
      .where(eq(schema.attachments.meetingId, meetingId))
      .all()
      .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))

    return c.json({ data })
  })

  router.post('/meetings/:meetingId/attachments', async (c) => {
    const meetingId = c.req.param('meetingId')
    const meeting = getMeeting(targetDb, meetingId)

    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404)
    }

    if (!canManageMeeting(targetDb, meetingId, c.get('userId'), c.get('userRole'))) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const formData = await c.req.raw.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return c.json({ error: 'File is required' }, 400)
    }

    const attachmentId = crypto.randomUUID()
    const uploadedAt = new Date().toISOString()
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = resolveStoredFilePath(attachmentId, file.name)

    await mkdir(getAttachmentsDirectory(), { recursive: true })
    await writeFile(filePath, buffer)

    const attachment = {
      id: attachmentId,
      meetingId,
      fileName: file.name,
      fileSize: buffer.byteLength,
      mimeType: file.type || null,
      url: `/api/attachments/${attachmentId}/download`,
      uploadedAt,
    }

    targetDb.insert(schema.attachments).values(attachment).run()

    return c.json({ data: attachment }, 201)
  })

  router.get('/attachments/:id/download', async (c) => {
    const attachment = targetDb.select()
      .from(schema.attachments)
      .where(eq(schema.attachments.id, c.req.param('id')))
      .get()

    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404)
    }

    if (!canReadMeeting(targetDb, attachment.meetingId, c.get('userId'), c.get('userRole'))) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    try {
      const content = await readFile(resolveStoredFilePath(attachment.id, attachment.fileName))
      return c.body(content, 200, {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${formatDownloadName(attachment.fileName)}"`,
      })
    } catch {
      return c.json({ error: 'Attachment file not found' }, 404)
    }
  })

  router.delete('/attachments/:id', async (c) => {
    const attachment = targetDb.select()
      .from(schema.attachments)
      .where(eq(schema.attachments.id, c.req.param('id')))
      .get()

    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404)
    }

    if (!canManageMeeting(targetDb, attachment.meetingId, c.get('userId'), c.get('userRole'))) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    targetDb.delete(schema.attachments)
      .where(eq(schema.attachments.id, attachment.id))
      .run()

    try {
      await unlink(resolveStoredFilePath(attachment.id, attachment.fileName))
    } catch {
      // Keep delete idempotent if the file is already gone.
    }

    return c.json({ data: attachment })
  })

  return router
}

export const attachmentRoutes = createAttachmentRoutes(db)
