import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next-auth getServerSession and provide a default export (NextAuth stub)
vi.mock('next-auth', () => ({ default: vi.fn(() => ({})), getServerSession: vi.fn() }))

// Mock prisma client used by the routes
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      teamMember: { findFirst: vi.fn() },
      user: { findUnique: vi.fn() },
      chatMessage: { create: vi.fn(), findMany: vi.fn() },
    },
  }
})

// Mock realtime helper
vi.mock('@/lib/realtime', () => ({ signSocketAuth: vi.fn(), trigger: vi.fn() }))

import * as authRoute from '../../app/api/realtime/auth/route'
import * as chatRoute from '../../app/api/teams/[teamId]/chat/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { signSocketAuth, trigger } from '@/lib/realtime'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Realtime auth and chat', () => {
  it('auth: returns 401 when unauthenticated', async () => {
    ;(getServerSession as any).mockResolvedValue(null)
    const req = { json: async () => ({ socket_id: 's1', channel_name: 'private-team-t1' }) } as any
    const res = await authRoute.POST(req as any)
    expect(res.status).toBe(401)
  })

  it('auth: returns 403 when not a team member', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { email: 'bob@example.com' } })
    ;(prisma.teamMember.findFirst as any).mockResolvedValue(null)
    const req = { json: async () => ({ socket_id: 's1', channel_name: 'private-team-t1' }) } as any
    const res = await authRoute.POST(req as any)
    expect(res.status).toBe(403)
  })

  it('auth: signs when member', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { email: 'alice@example.com', name: 'Alice' } })
    ;(prisma.teamMember.findFirst as any).mockResolvedValue({ id: 'm1', userId: 'u1' })
    ;(signSocketAuth as any).mockReturnValue({ auth: 'signed' })
    const req = { json: async () => ({ socket_id: 's1', channel_name: 'private-team-t1' }) } as any
    const res = await authRoute.POST(req as any)
    const body = await res.json()
    expect(signSocketAuth).toHaveBeenCalled()
    expect(body).toEqual({ auth: 'signed' })
  })

  it('chat: triggers realtime event after creating message', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { email: 'alice@example.com', name: 'Alice' } })
    ;(prisma.user.findUnique as any).mockResolvedValue({ id: 'u1' })
    ;(prisma.chatMessage.create as any).mockResolvedValue({ id: 'm1', content: 'hello', teamId: 't1', userId: 'u1' })

    const req = { json: async () => ({ content: 'hello' }) } as any
    await chatRoute.POST(req as any, { params: { teamId: 't1' } } as any)

    expect(trigger).toHaveBeenCalled()
  })
})
