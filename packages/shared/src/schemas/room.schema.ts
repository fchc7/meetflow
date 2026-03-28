import { z } from 'zod'

export const roomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  location: z.string().max(200).optional(),
  capacity: z.number().int().positive(),
  equipment: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
})

export type Room = z.infer<typeof roomSchema>
