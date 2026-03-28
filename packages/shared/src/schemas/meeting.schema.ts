import { z } from 'zod'

export const meetingSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  agenda: z.string().max(5000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  roomId: z.string().uuid(),
  hostId: z.string().uuid(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  status: z.enum(['scheduled', 'cancelled', 'completed']).default('scheduled'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createMeetingSchema = meetingSchema.pick({
  title: true,
  description: true,
  agenda: true,
  startTime: true,
  endTime: true,
  roomId: true,
  recurrence: true,
}).extend({
  participantIds: z.array(z.string().uuid()).min(1),
})

export type Meeting = z.infer<typeof meetingSchema>
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>
