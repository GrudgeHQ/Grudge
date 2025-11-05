import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await params

  try {
    // Verify user is a member of a team in this league
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userTeamInLeague = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: {
          members: {
            some: { userId: user.id }
          }
        }
      }
    })

    if (!userTeamInLeague) {
      return NextResponse.json({ error: 'Access denied - not a member of this league' }, { status: 403 })
    }

    // Get only league-scoped messages (messages with [LEAGUE] prefix)
    const leagueTeamIds = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { teamId: true }
    })

  const teamIds = leagueTeamIds.map((lt: { teamId: string }) => lt.teamId)

    const messages = await prisma.chatMessage.findMany({
      where: {
        teamId: { in: teamIds },
        content: { startsWith: '[LEAGUE]' } // Only get league messages
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
    console.error('Error fetching league chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await params
  const body = await req.json()
  const { content, teamId } = body

  if (!content || !teamId) {
    return NextResponse.json({ error: 'Content and teamId required' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is a member of the specified team and team is in the league
    const teamMembership = await prisma.teamMember.findFirst({
      where: {
        userId: user.id,
        teamId,
        team: {
          leagues: {
            some: { leagueId }
          }
        }
      }
    })

    if (!teamMembership) {
      return NextResponse.json({ error: 'Access denied - not a member of this team/league' }, { status: 403 })
    }

    // Create league message (for now using teamId, will update when Prisma client regenerated)
    const message = await prisma.chatMessage.create({
      data: {
        teamId,
        userId: user.id,
        content: `[LEAGUE] ${content}` // Prefix to indicate league message
      }
    })

    // Create notifications for all league members except the sender
    const leagueTeams = await prisma.leagueTeam.findMany({
      where: { leagueId },
      include: {
        team: {
          include: {
            members: true
          }
        }
      }
    })

    // Flatten all team members and exclude sender
    const allMemberIds = leagueTeams
      .flatMap((lt: { team: { members: { userId: string }[] } }) => lt.team.members.map((m: { userId: string }) => m.userId))
      .filter((userId: string) => userId !== user.id)

    // Remove duplicates (users could be in multiple teams)
    const uniqueMemberIds = [...new Set(allMemberIds)]

    // Create notifications for each member
    await Promise.all(
      uniqueMemberIds.map((memberId) =>
        prisma.notification.create({
          data: {
            userId: memberId,
            type: 'chat.league_message',
            payload: {
              messageId: message.id,
              senderName: user.name,
              leagueName: leagueId,
              teamName: 'League Team', // TODO: Get actual team name when Prisma client updated
              preview: content.substring(0, 50)
            }
          }
        })
      )
    )

    // Trigger realtime event for league
    try {
      const { trigger } = await import('@/lib/realtime')
      await trigger(`league_${leagueId}`, 'chat.league_message', { message })
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true, message })
  } catch (error) {
    console.error('Error sending league message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await params

  try {
    // Verify user is a member of a team in this league
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userTeamInLeague = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: {
          members: {
            some: { userId: user.id }
          }
        }
      }
    })

    if (!userTeamInLeague) {
      return NextResponse.json({ error: 'Access denied - not a member of this league' }, { status: 403 })
    }

    // Get all teams in this league
    const leagueTeamIds = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { teamId: true }
    })

  const teamIds = leagueTeamIds.map((lt: any) => lt.teamId)

    // Delete only league-scoped messages (messages with [LEAGUE] prefix)
    await prisma.chatMessage.deleteMany({
      where: {
        teamId: { in: teamIds },
        content: { startsWith: '[LEAGUE]' }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error clearing league chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}