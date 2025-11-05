import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { teamId } = await params
  const url = new URL(req.url)
  const targetTeamId = url.searchParams.get('targetTeamId')

  if (!targetTeamId) {
    return NextResponse.json({ error: 'targetTeamId required' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is a member of the source team
    const sourceTeamMembership = await prisma.teamMember.findFirst({
      where: { userId: user.id, teamId }
    })

    if (!sourceTeamMembership) {
      return NextResponse.json({ error: 'Access denied - not a member of source team' }, { status: 403 })
    }

    // Verify both teams are in the same league
    const sourceLeague = await prisma.leagueTeam.findFirst({
      where: { teamId },
      include: { league: true }
    })

    const targetLeague = await prisma.leagueTeam.findFirst({
      where: { teamId: targetTeamId },
      include: { league: true }
    })

    if (!sourceLeague || !targetLeague || sourceLeague.leagueId !== targetLeague.leagueId) {
      return NextResponse.json({ error: 'Teams must be in the same league' }, { status: 403 })
    }

    // Get team-to-team messages between these two teams (using content filtering for now)
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          // Messages from source team containing target team reference
          { teamId, content: { contains: `[TEAM_TO_TEAM:${targetTeamId}]` } },
          // Messages from target team containing source team reference
          { teamId: targetTeamId, content: { contains: `[TEAM_TO_TEAM:${teamId}]` } }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching team-to-team chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { teamId } = await params
  const body = await req.json()
  const { content, targetTeamId } = body

  if (!content || !targetTeamId) {
    return NextResponse.json({ error: 'Content and targetTeamId required' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is a member of the source team
    const sourceTeamMembership = await prisma.teamMember.findFirst({
      where: { userId: user.id, teamId }
    })

    if (!sourceTeamMembership) {
      return NextResponse.json({ error: 'Access denied - not a member of source team' }, { status: 403 })
    }

    // Verify both teams are in the same league
    const sourceLeague = await prisma.leagueTeam.findFirst({
      where: { teamId }
    })

    const targetLeague = await prisma.leagueTeam.findFirst({
      where: { teamId: targetTeamId }
    })

    if (!sourceLeague || !targetLeague || sourceLeague.leagueId !== targetLeague.leagueId) {
      return NextResponse.json({ error: 'Teams must be in the same league' }, { status: 403 })
    }

    // Create team-to-team message (using content-based targeting for now)
    const message = await prisma.chatMessage.create({
      data: {
        teamId,
        userId: user.id,
        content: `[TEAM_TO_TEAM:${targetTeamId}] ${content}` // Include target team ID in content
      }
    })

    // Create notifications for all members of both teams except the sender
    const sourceTeamMembers = await prisma.teamMember.findMany({
      where: { teamId, userId: { not: user.id } }
    })

    const targetTeamMembers = await prisma.teamMember.findMany({
      where: { teamId: targetTeamId }
    })

    const allMemberIds = [
      ...sourceTeamMembers.map(m => m.userId),
      ...targetTeamMembers.map(m => m.userId)
    ]

    // Create notifications for each member
    await Promise.all(
      allMemberIds.map((memberId) =>
        prisma.notification.create({
          data: {
            userId: memberId,
            type: 'chat.team_to_team_message',
            payload: {
              messageId: message.id,
              senderName: user.name,
              sourceTeamId: teamId,
              targetTeamId: targetTeamId,
              preview: content.substring(0, 50)
            }
          }
        })
      )
    )

    // Trigger realtime event
    try {
      const { trigger } = await import('@/lib/realtime')
      await trigger(`team_to_team_${teamId}_${targetTeamId}`, 'chat.team_to_team_message', { message })
      await trigger(`team_to_team_${targetTeamId}_${teamId}`, 'chat.team_to_team_message', { message })
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true, message })
  } catch (error) {
    console.error('Error sending team-to-team message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { teamId } = await params
  const url = new URL(req.url)
  const targetTeamId = url.searchParams.get('targetTeamId')

  if (!targetTeamId) {
    return NextResponse.json({ error: 'targetTeamId required' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is a member of the source team
    const sourceTeamMembership = await prisma.teamMember.findFirst({
      where: { userId: user.id, teamId }
    })

    if (!sourceTeamMembership) {
      return NextResponse.json({ error: 'Access denied - not a member of source team' }, { status: 403 })
    }

    // Verify both teams are in the same league
    const sourceLeague = await prisma.leagueTeam.findFirst({
      where: { teamId }
    })

    const targetLeague = await prisma.leagueTeam.findFirst({
      where: { teamId: targetTeamId }
    })

    if (!sourceLeague || !targetLeague || sourceLeague.leagueId !== targetLeague.leagueId) {
      return NextResponse.json({ error: 'Teams must be in the same league' }, { status: 403 })
    }

    // Clear team-to-team messages between these two teams
    await prisma.chatMessage.deleteMany({
      where: {
        OR: [
          // Messages from source team containing target team reference
          { teamId, content: { contains: `[TEAM_TO_TEAM:${targetTeamId}]` } },
          // Messages from target team containing source team reference
          { teamId: targetTeamId, content: { contains: `[TEAM_TO_TEAM:${teamId}]` } }
        ]
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error clearing team-to-team chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}