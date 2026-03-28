import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createAuthRoutes } from './routes/auth.routes.js'
import { createAttachmentRoutes } from './routes/attachment.routes.js'
import { createMeetingRoutes } from './routes/meeting.routes.js'
import { createNotificationRoutes } from './routes/notification.routes.js'
import { createRoomRoutes } from './routes/room.routes.js'
import { createUserRoutes } from './routes/user.routes.js'
import { db } from './db/index.js'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.route('/api/auth', createAuthRoutes(db))
app.route('/api', createAttachmentRoutes(db))
app.route('/api/meetings', createMeetingRoutes(db))
app.route('/api/notifications', createNotificationRoutes(db))
app.route('/api/rooms', createRoomRoutes(db))
app.route('/api/users', createUserRoutes(db))

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
