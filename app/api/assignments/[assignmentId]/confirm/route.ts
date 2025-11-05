import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const assignmentId = params?.assignmentId
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!assignmentId) return NextResponse.json({ error: 'assignmentId required' }, { status: 400 })

  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } })
  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

  // ensure the caller is the assigned user
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.id !== assignment.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.assignment.update({ where: { id: assignmentId }, data: { confirmed: true, confirmedAt: new Date() } })

  // Mark all ASSIGNMENT_PENDING notifications for this user as read (confirmed assignments are obsolete)
  // Note: We mark all pending notifications since SQLite doesn't support JSON path filtering easily
  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      type: 'ASSIGNMENT_PENDING',
      read: false
    },
    data: { read: true }
  })

  return NextResponse.json({ ok: true, assignment: updated })
}
