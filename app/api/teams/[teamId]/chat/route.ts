import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const teamId = params?.teamId
  if (!teamId) return NextResponse.json({ messages: [] })
  
  const messages = await prisma.chatMessage.findMany({ 
    where: { 
      teamId,
      content: { not: { startsWith: '[LEAGUE]' } } // Exclude league messages
    }, 
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })
  
  return NextResponse.json({ messages })
}

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const teamId = params?.teamId
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 })
  const body = await req.json()
  const { content } = body
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const message = await prisma.chatMessage.create({ data: { teamId, userId: user.id, content } })
  
  // Create notifications for all team members except the sender
  const teamMembers = await prisma.teamMember.findMany({
    where: { 
      teamId,
      userId: { not: user.id }
    }
  })

  // Create notification for each team member
  await Promise.all(
  teamMembers.map((member: { userId: string }) =>
      prisma.notification.create({
        data: {
          userId: member.userId,
          teamId,
          type: 'chat.message',
          payload: {
            messageId: message.id,
            senderName: user.name,
            preview: content.substring(0, 50)
          }
        }
      })
    )
  )

  // trigger realtime chat event (no-op if realtime not configured)
  try {
    const { trigger } = await import('@/lib/realtime')
    await trigger(teamId, 'chat.message', { message })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ ok: true, message })
}

export async function DELETE(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const teamId = params?.teamId
  const session = (await getServerSession(authOptions as any)) as any
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 })
  }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  // Verify user is a member of this team
  const teamMember = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId: user.id,
        teamId
      }
    }
  })
  
  if (!teamMember) {
    return NextResponse.json({ error: 'Access denied - not a member of this team' }, { status: 403 })
  }
  
  // Delete only team-scoped messages (exclude league and team-to-team messages)
  await prisma.chatMessage.deleteMany({ 
    where: { 
      teamId,
      AND: [
        {
          content: { 
            not: { 
              startsWith: '[LEAGUE]' 
            } 
          }
        },
        {
          content: {
            not: {
              contains: '[TEAM_TO_TEAM:'
            }
          }
        }
      ]
    } 
  })
  
  return NextResponse.json({ ok: true })
}
