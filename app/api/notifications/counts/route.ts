import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    // If 'all' teams selected, return counts for all teams
    if (teamId === 'all') {
      const [unreadChatCount, unreadCount, pendingAssignments] = await Promise.all([
        prisma.notification.count({ 
          where: { 
            userId: user.id, 
            read: false,
            type: 'chat.message'
          } 
        }),
        prisma.notification.count({ 
          where: { 
            userId: user.id, 
            read: false,
            type: { not: 'chat.message' }
          } 
        }),
        prisma.assignment.count({
          where: { userId: user.id, confirmed: false }
        })
      ])

      return NextResponse.json({
        unreadChatCount,
        unreadCount,
        pendingAssignments
      })
    }

    // Return default counts for now
    return NextResponse.json({
      unreadChatCount: 0,
      unreadCount: 0,
      pendingAssignments: 0
    })

  } catch (error) {
    console.error('Failed to get notification counts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}