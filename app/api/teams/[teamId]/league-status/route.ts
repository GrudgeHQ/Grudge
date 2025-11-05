import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/teams/[teamId]/league-status - Check if team has joined any leagues
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params
  const session = (await getServerSession(authOptions as any)) as any

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is a team administrator
    const teamMembership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId
        }
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            sport: true
          }
        }
      }
    })

    if (!teamMembership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if team is in any leagues
    const leagueMemberships = await prisma.leagueTeam.findMany({
      where: { teamId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sport: true,
            creatorId: true
          }
        }
      }
    })

    // Check if there are any pending join requests
    const pendingJoinRequests = await prisma.leagueJoinRequest.findMany({
      where: {
        teamId,
        status: 'PENDING'
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sport: true
          }
        }
      }
    })

    // Count available leagues in the same sport that the team could join
    const availableLeagues = await prisma.league.findMany({
      where: {
        sport: teamMembership.team.sport,
        // Exclude leagues the team is already in
        NOT: {
          id: {
            in: leagueMemberships.map((lm: any) => lm.league.id)
          }
        }
      },
      include: {
        _count: {
          select: {
            teams: true
          }
        }
      },
      take: 5 // Limit to 5 suggestions
    })

    return NextResponse.json({
      isTeamAdmin: teamMembership.isAdmin,
      team: teamMembership.team,
      hasJoinedLeagues: leagueMemberships.length > 0,
  leagueMemberships: leagueMemberships.map((lm: any) => ({
        id: lm.league.id,
        name: lm.league.name,
        sport: lm.league.sport,
        isLeagueManager: lm.league.creatorId === user.id
      })),
  pendingRequests: pendingJoinRequests.map((pjr: any) => ({
        id: pjr.id,
        league: pjr.league
      })),
  suggestedLeagues: availableLeagues.map((al: any) => ({
        id: al.id,
        name: al.name,
        sport: al.sport,
        teamCount: al._count.teams
      }))
    })
  } catch (error) {
    console.error('Error checking league status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}