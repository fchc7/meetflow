import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTestDb } from '../../db/index.js'
import { createAttachmentRoutes } from '../attachment.routes.js'
import { rooms, users, meetings } from '../../db/schema.js'

const secret = new TextEncoder().encode('dev-secret')

async function createToken(userId: string, role: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .sign(secret)
}

describe('Attachment Routes', () => {
  let app: Hono
  let db: ReturnType<typeof createTestDb>
  let tempDir: string
  let hostToken: string

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'meetflow-attachments-'))
    process.env.ATTACHMENTS_DIR = tempDir

    db = createTestDb()
    app = new Hono()
    app.route('/api', createAttachmentRoutes(db))

    db.insert(users).values({
      id: 'host-1',
      name: 'Host User',
      email: 'host@test.com',
      passwordHash: 'hash',
      role: 'host',
      createdAt: new Date().toISOString(),
    }).run()

    db.insert(rooms).values({
      id: 'room-1',
      name: 'Room 1',
      capacity: 8,
      createdAt: new Date().toISOString(),
    }).run()

    db.insert(meetings).values({
      id: 'meeting-1',
      title: 'Attachment Meeting',
      startTime: '2026-03-28T09:00:00.000Z',
      endTime: '2026-03-28T10:00:00.000Z',
      roomId: 'room-1',
      hostId: 'host-1',
      recurrence: 'none',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run()

    hostToken = await createToken('host-1', 'host')
  })

  afterEach(() => {
    delete process.env.ATTACHMENTS_DIR
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('uploads and lists attachments for a meeting', async () => {
    const form = new FormData()
    form.set('file', new File(['agenda content'], 'agenda.txt', { type: 'text/plain' }))

    const uploadRes = await app.request('/api/meetings/meeting-1/attachments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
      body: form,
    })

    expect(uploadRes.status).toBe(201)
    const uploadBody = await uploadRes.json()
    expect(uploadBody.data.fileName).toBe('agenda.txt')

    const listRes = await app.request('/api/meetings/meeting-1/attachments', {
      headers: { Authorization: `Bearer ${hostToken}` },
    })

    expect(listRes.status).toBe(200)
    const listBody = await listRes.json()
    expect(listBody.data).toHaveLength(1)
    expect(listBody.data[0].url).toContain('/api/attachments/')
  })

  it('downloads and deletes an attachment', async () => {
    const form = new FormData()
    form.set('file', new File(['minutes content'], 'minutes.txt', { type: 'text/plain' }))

    const uploadRes = await app.request('/api/meetings/meeting-1/attachments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
      body: form,
    })

    const uploadBody = await uploadRes.json()
    const attachmentId = uploadBody.data.id as string

    const downloadRes = await app.request(`/api/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    })
    expect(downloadRes.status).toBe(200)
    expect(await downloadRes.text()).toBe('minutes content')

    const deleteRes = await app.request(`/api/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hostToken}` },
    })
    expect(deleteRes.status).toBe(200)
  })
})
