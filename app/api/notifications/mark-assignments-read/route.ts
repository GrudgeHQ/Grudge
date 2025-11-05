import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Mark all ASSIGNMENT_PENDING notifications as read for this user
  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      type: 'ASSIGNMENT_PENDING',
      read: false
    },
    data: {
      read: true
    }
  })

  return NextResponse.json({ ok: true })
}
