import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/teams/[teamId]/admin-chat - Get admin chat messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await params

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is an admin of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: user.id,
        isAdmin: true
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied - admin privileges required' }, { status: 403 })
    }

    // Get admin chat messages (using ChatMessage with admin scope)
    const messages = await prisma.chatMessage.findMany({
      where: {
        teamId,
        scope: 'admin'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 100 // Limit to last 100 messages
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching admin chat messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams/[teamId]/admin-chat - Send admin chat message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await params

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is an admin of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: user.id,
        isAdmin: true
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied - admin privileges required' }, { status: 403 })
    }

    const body = await request.json()
    const { content } = body

    // Validate message content
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (content.trim().length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 characters)' }, { status: 400 })
    }

    // Create admin chat message (using ChatMessage with admin scope)
    const message = await prisma.chatMessage.create({
      data: {
        content: content.trim(),
        userId: user.id,
        teamId,
        scope: 'admin'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ 
      message,
      success: 'Message sent successfully'
    })
  } catch (error) {
    console.error('Error sending admin chat message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}