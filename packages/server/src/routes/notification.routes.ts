import { Hono } from 'hono'
import { z } from 'zod'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema.js'
import { db } from '../db/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { listNotifications, markNotificationAsRead } from '../services/notification.service.js'

type Env = { Variables: { userId: string; userRole: string } }

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  read: z.enum(['true', 'false']).optional(),
})

export function createNotificationRoutes(targetDb: BetterSQLite3Database<typeof schema>) {
  const router = new Hono<Env>()

  router.use('*', authMiddleware)

  router.get('/', (c) => {
    const parsed = listQuerySchema.safeParse({
      page: c.req.query('page') ?? '1',
      limit: c.req.query('limit') ?? '20',
      read: c.req.query('read'),
    })

    if (!parsed.success) {
      return c.json({ error: parsed.error.issues }, 400)
    }

    const userId = c.get('userId')
    return c.json(listNotifications(targetDb, userId, {
      page: parsed.data.page,
      limit: parsed.data.limit,
      read: parsed.data.read === undefined ? undefined : parsed.data.read === 'true',
    }))
  })

  router.patch('/:id/read', (c) => {
    const notification = markNotificationAsRead(targetDb, c.get('userId'), c.req.param('id'))
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404)
    }

    return c.json({ data: notification })
  })

  return router
}

export const notificationRoutes = createNotificationRoutes(db)
