import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'host', 'participant']).default('participant'),
  createdAt: z.string().datetime(),
})

export type User = z.infer<typeof userSchema>
