import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/notifications/mark-chat-read - Mark chat notifications as read for a specific team
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const { teamId } = body

  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 })
  }

  // Mark all chat notifications as read for this user and team
  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      teamId,
      type: 'chat.message',
      read: false
    },
    data: {
      read: true
    }
  })

  return NextResponse.json({ ok: true })
}
