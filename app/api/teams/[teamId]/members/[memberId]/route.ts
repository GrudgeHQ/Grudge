import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { teamId, memberId } = params || {}

  // verify caller is admin
  const caller = await prisma.teamMember.findFirst({ where: { teamId, user: { email: session.user.email } } })
  if (!caller || !caller.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // prevent deleting the last admin
  const target = await prisma.teamMember.findUnique({ where: { id: memberId } })
  if (!target || target.teamId !== teamId) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  if (target.isAdmin) {
    const adminCount = await prisma.teamMember.count({ where: { teamId, isAdmin: true } })
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last admin. Transfer admin to another member first.' }, { status: 400 })
    }
  }

  await prisma.teamMember.deleteMany({ where: { teamId, userId: memberId } })
  try {
    await prisma.notification.create({ data: { userId: memberId, teamId, type: 'REMOVED_FROM_TEAM', payload: { by: caller.userId, teamId }, read: false } })
  } catch (e) {
    // ignore
  }

  // write audit log
  try {
    await prisma.auditLog.create({ data: { action: 'REMOVE_MEMBER', actorId: caller.userId, teamId, targetId: memberId, payload: { by: caller.userId } } as any })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ ok: true })
}
