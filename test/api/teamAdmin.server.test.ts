import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next-auth: provide a default export (NextAuth stub) and getServerSession
vi.mock('next-auth', () => ({ default: vi.fn(() => ({})), getServerSession: vi.fn() }))

// Mock prisma client used by the routes
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      teamMember: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      notification: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    },
  }
})

import * as demoteRoute from '../../app/api/teams/[teamId]/demote/route'
import * as relinquishRoute from '../../app/api/teams/[teamId]/relinquish/route'
import * as membersRoute from '../../app/api/teams/[teamId]/members/[memberId]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Team admin server endpoints', () => {
  it('demote: succeeds when other admins exist', async () => {
  (getServerSession as unknown as { mockResolvedValue: Function }).mockResolvedValue({ user: { email: 'alice@example.com' } })
  (prisma.teamMember.findFirst as unknown as { mockResolvedValue: Function }).mockResolvedValue({ id: 'caller', isAdmin: true, userId: 'callerUser' })
  (prisma.teamMember.findUnique as unknown as { mockResolvedValue: Function }).mockResolvedValue({ id: 'target', teamId: 'team1', isAdmin: true, userId: 'targetUser' })
  (prisma.teamMember.count as unknown as { mockResolvedValue: Function }).mockResolvedValue(2)
  (prisma.teamMember.update as unknown as { mockResolvedValue: Function }).mockResolvedValue(true)

    const req = {
      json: async () => ({ userId: 'target' }),
      // Minimal mock for Request interface
      cache: 'default',
      credentials: 'same-origin',
      destination: '',
      headers: new Headers(),
      integrity: '',
      keepalive: false,
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      referrer: '',
      referrerPolicy: '',
      url: '',
      body: null,
      bodyUsed: false,
      clone: () => req,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      text: async () => '',
    } as Request;
    const res = await demoteRoute.POST(req, { params: { teamId: 'team1' } })

    // ensure update was called
    expect(prisma.teamMember.update).toHaveBeenCalled()
    expect(prisma.notification.create).toHaveBeenCalled()
    expect(prisma.auditLog.create).toHaveBeenCalled()
  })

  it('demote: blocked when demoting last admin', async () => {
  (getServerSession as unknown as { mockResolvedValue: Function }).mockResolvedValue({ user: { email: 'alice@example.com' } })
  (prisma.teamMember.findFirst as unknown as { mockResolvedValue: Function }).mockResolvedValue({ id: 'caller', isAdmin: true, userId: 'callerUser' })
  (prisma.teamMember.findUnique as unknown as { mockResolvedValue: Function }).mockResolvedValue({ id: 'target', teamId: 'team1', isAdmin: true, userId: 'targetUser' })
  (prisma.teamMember.count as unknown as { mockResolvedValue: Function }).mockResolvedValue(1)

    const req = {
      json: async () => ({ userId: 'target' }),
      cache: 'default',
      credentials: 'same-origin',
      destination: '',
      headers: new Headers(),
      integrity: '',
      keepalive: false,
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      referrer: '',
      referrerPolicy: '',
      url: '',
      body: null,
      bodyUsed: false,
      clone: () => req,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      text: async () => '',
    } as Request;
    const res = await demoteRoute.POST(req, { params: { teamId: 'team1' } })

    // update should not be called when only one admin exists
    expect(prisma.teamMember.update).not.toHaveBeenCalled()
  })

  it('relinquish: if other admins exist, just relinquish', async () => {
    (getServerSession as unknown as { mockResolvedValue: Function }).mockResolvedValue({ user: { email: 'alice@example.com' } })
    (prisma.teamMember.findFirst as unknown as { mockResolvedValue: Function }).mockResolvedValue({ 
      id: 'caller', 
      isAdmin: true, 
      userId: 'callerUser',
      role: 'MEMBER',
      team: { name: 'Test Team' }
    })
    (prisma.teamMember.findMany as unknown as { mockResolvedValue: Function }).mockResolvedValue([
      { id: 'other', isAdmin: true, user: { name: 'Other Admin' } }
    ]) // other admins exist
    (prisma.teamMember.update as unknown as { mockResolvedValue: Function }).mockResolvedValue(true)
    (prisma.notification.create as unknown as { mockResolvedValue: Function }).mockResolvedValue(true)
    (prisma.auditLog.create as unknown as { mockResolvedValue: Function }).mockResolvedValue(true)

    const req = {
      json: async () => ({}),
      cache: 'default',
      credentials: 'same-origin',
      destination: '',
      headers: new Headers(),
      integrity: '',
      keepalive: false,
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      referrer: '',
      referrerPolicy: '',
      url: '',
      body: null,
      bodyUsed: false,
      clone: () => req,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      text: async () => '',
    } as Request;
    const res = await relinquishRoute.POST(req, { params: { teamId: 'team1' } })

    expect(prisma.teamMember.update).toHaveBeenCalled()
    expect(prisma.notification.create).toHaveBeenCalled()
    expect(prisma.auditLog.create).toHaveBeenCalled()
  })

  it('relinquish: last admin must transfer', async () => {
    (getServerSession as unknown as { mockResolvedValue: Function }).mockResolvedValue({ user: { email: 'alice@example.com' } })
    (prisma.teamMember.findFirst as unknown as { mockResolvedValue: Function }).mockResolvedValue({ 
      id: 'caller', 
      isAdmin: true, 
      userId: 'callerUser',
      role: 'MEMBER',
      team: { name: 'Test Team' }
    })
    (prisma.teamMember.findMany as unknown as { mockResolvedValue: Function }).mockResolvedValue([]) // no other admins
    (prisma.teamMember.findUnique as unknown as { mockResolvedValue: Function }).mockResolvedValue({ 
      id: 'm2', 
      teamId: 'team1', 
      userId: 'targetUser',
      isAdmin: false,
      user: { name: 'Target User' }
    })
    ;(prisma.$transaction as any).mockResolvedValue(true)
    ;(prisma.notification.createMany as any).mockResolvedValue(true)
    ;(prisma.auditLog.create as any).mockResolvedValue(true)

    const req = { json: async () => ({ transferToUserId: 'm2' }) } as any
    const res = await relinquishRoute.POST(req, { params: { teamId: 'team1' } })

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.notification.createMany).toHaveBeenCalled()
    expect(prisma.auditLog.create).toHaveBeenCalled()
  })

  it('delete member: prevents removing last admin', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { email: 'alice@example.com' } })
    ;(prisma.teamMember.findFirst as any).mockResolvedValue({ id: 'caller', isAdmin: true, userId: 'callerUser' })
    ;(prisma.teamMember.findUnique as any).mockResolvedValue({ id: 'm1', teamId: 'team1', isAdmin: true, userId: 'm1User' })
    ;(prisma.teamMember.count as any).mockResolvedValue(1)

    const req = {} as any
    await membersRoute.DELETE(req, { params: { teamId: 'team1', memberId: 'm1' } })

    expect(prisma.teamMember.deleteMany).not.toHaveBeenCalled()
  })

  it('demote: creates notification and audit log with expected payload', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { email: 'alice@example.com' } })
    ;(prisma.teamMember.findFirst as any).mockResolvedValue({ id: 'caller', isAdmin: true, userId: 'callerUser' })
    ;(prisma.teamMember.findUnique as any).mockResolvedValue({ id: 'target', teamId: 'team1', isAdmin: true, userId: 'targetUser' })
    ;(prisma.teamMember.count as any).mockResolvedValue(2)
    ;(prisma.teamMember.update as any).mockResolvedValue(true)

    const req = { json: async () => ({ userId: 'target' }) } as any
    await demoteRoute.POST(req, { params: { teamId: 'team1' } })

    expect(prisma.notification.create).toHaveBeenCalled()
    expect(prisma.auditLog.create).toHaveBeenCalled()

    // check notification payload shape
    const notifArg = (prisma.notification.create as any).mock.calls[0][0]
    expect(notifArg).toHaveProperty('data')
    expect(notifArg.data).toEqual(expect.objectContaining({ userId: 'targetUser', teamId: 'team1', type: 'ADMIN_DEMOTED' }))

    const auditArg = (prisma.auditLog.create as any).mock.calls[0][0]
    expect(auditArg).toHaveProperty('data')
    expect(auditArg.data).toEqual(expect.objectContaining({ action: 'DEMOTE', actorId: 'callerUser', teamId: 'team1', targetId: 'targetUser' }))
  })

  it('demote: returns 401 when unauthenticated', async () => {
    ;(getServerSession as any).mockResolvedValue(null)
    const req = { json: async () => ({ userId: 'target' }) } as any
    const res = await demoteRoute.POST(req, { params: { teamId: 'team1' } })
    expect(res.status).toBe(401)
  })

  it('demote: returns 403 when caller is not admin', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { email: 'alice@example.com' } })
    ;(prisma.teamMember.findFirst as any).mockResolvedValue({ id: 'caller', isAdmin: false, userId: 'callerUser' })
    const req = { json: async () => ({ userId: 'target' }) } as any
    const res = await demoteRoute.POST(req, { params: { teamId: 'team1' } })
    expect(res.status).toBe(403)
  })

  it('demote: invalid input returns 400', async () => {
    ;(getServerSession as any).mockResolvedValue({ user: { email: 'alice@example.com' } })
    ;(prisma.teamMember.findFirst as any).mockResolvedValue({ id: 'caller', isAdmin: true, userId: 'callerUser' })
    const req = { json: async () => ({}) } as any
    const res = await demoteRoute.POST(req, { params: { teamId: 'team1' } })
    expect(res.status).toBe(400)
  })
})
