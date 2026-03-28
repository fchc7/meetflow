import 'dotenv/config'
import { serve } from '@hono/node-server'
import cron from 'node-cron'
import app from './index.js'
import { db } from './db/index.js'
import { processReminderNotifications } from './services/notification.service.js'

const port = Number(process.env.PORT || 3000)

cron.schedule('*/15 * * * *', () => {
  const created = processReminderNotifications(db)
  if (created > 0) {
    console.log(`Processed ${created} reminder notifications`)
  }
})

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`MeetFlow server running at http://localhost:${info.port}`)
})
