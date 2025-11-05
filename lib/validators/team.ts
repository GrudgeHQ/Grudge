import { z } from 'zod'

export const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  // allow empty string to mean clear password; null allowed
  password: z.union([z.string(), z.null()]).optional(),
})

export const demoteSchema = z.object({
  userId: z.string().min(1),
})

export const relinquishSchema = z.object({
  transferToUserId: z.string().min(1).optional(),
})

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type DemoteInput = z.infer<typeof demoteSchema>
export type RelinquishInput = z.infer<typeof relinquishSchema>
