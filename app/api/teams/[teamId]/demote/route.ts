import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { demoteSchema } from '@/lib/validators/team'

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const teamId = params?.teamId
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 })

  // verify caller is admin
  const caller = await prisma.teamMember.findFirst({ where: { teamId, user: { email: session.user.email } } })
  if (!caller || !caller.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let input: any
  try {
    const json = await req.json()
    input = demoteSchema.parse(json)
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid input', details: err?.errors ?? err?.message }, { status: 400 })
  }

  const { userId } = input

  // ensure at least one admin remains after demotion
  const adminCount = await prisma.teamMember.count({ where: { teamId, isAdmin: true } })
  const target = await prisma.teamMember.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (target.isAdmin && adminCount <= 1) return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 })

  await prisma.teamMember.update({ where: { id: userId }, data: { isAdmin: false } })
  // create a notification for the demoted user
  try {
    await prisma.notification.create({ data: { userId: target.userId, teamId, type: 'ADMIN_DEMOTED', payload: { by: caller.userId, teamId, target: target.userId }, read: false } })
  } catch (e) {
    // non-fatal
  }

  // add an audit log entry
  try {
    await prisma.auditLog.create({ data: { action: 'DEMOTE', actorId: caller.userId, teamId, targetId: target.userId, payload: { by: caller.userId } } as any })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ ok: true })
}
