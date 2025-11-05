import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cleanupObsoleteNotifications } from '@/lib/notificationCleanup'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ notifications: [] })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ notifications: [] })
  
  // Clean up obsolete notifications before returning
  await cleanupObsoleteNotifications(user.id)
  
  const notes = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ notifications: notes })
}

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, read } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updated = await prisma.notification.updateMany({ where: { id, user: { email: session.user.email } }, data: { read: !!read } })
  return NextResponse.json({ ok: true, result: updated })
}

export async function DELETE() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Delete all notifications for this user
  await prisma.notification.deleteMany({
    where: { userId: user.id }
  })

  return NextResponse.json({ ok: true })
}
