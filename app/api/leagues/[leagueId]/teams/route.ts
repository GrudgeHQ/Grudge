import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/leagues/[leagueId]/teams - Get all teams in the league
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await params

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify the league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        sport: true,
        creatorId: true
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Check if user has access to this league
    const hasAccess = await prisma.user.findFirst({
      where: {
        id: user.id,
        OR: [
          // User is league manager
          { createdLeagues: { some: { id: leagueId } } },
          // User is member of a team in this league
          {
            memberships: {
              some: {
                team: {
                  leagues: {
                    some: { leagueId: leagueId }
                  }
                }
              }
            }
          }
        ]
      }
    })

    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'Access denied - You are not associated with this league' 
      }, { status: 403 })
    }

    // Get all teams in the league with their details
    const leagueTeams = await prisma.leagueTeam.findMany({
      where: { leagueId: leagueId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              },
              orderBy: [
                { isAdmin: 'desc' },
                { user: { name: 'asc' } }
              ]
            }
          }
        }
      },
      orderBy: [
        { team: { name: 'asc' } }
      ]
    })

    // Get match statistics for each team
    const teamsWithStats = await Promise.all(
      leagueTeams.map(async (leagueTeam) => {
        const teamId = leagueTeam.team.id

        // Get all matches for this team in this league
        const matches = await prisma.leagueMatch.findMany({
          where: {
            leagueId: leagueId,
            OR: [
              { homeTeamId: teamId },
              { awayTeamId: teamId }
            ]
          }
        })

        const completedMatches = matches.filter(match => 
          match.homeScore !== null && 
          match.awayScore !== null
        )

        const wins = completedMatches.filter(match => {
          if (match.homeTeamId === teamId) return (match.homeScore || 0) > (match.awayScore || 0)
          if (match.awayTeamId === teamId) return (match.awayScore || 0) > (match.homeScore || 0)
          return false
        }).length

        const losses = completedMatches.filter(match => {
          if (match.homeTeamId === teamId) return (match.homeScore || 0) < (match.awayScore || 0)
          if (match.awayTeamId === teamId) return (match.awayScore || 0) < (match.homeScore || 0)
          return false
        }).length

        const ties = completedMatches.filter(match => 
          (match.homeScore || 0) === (match.awayScore || 0)
        ).length

        const upcomingMatches = matches.filter(match => 
          new Date(match.scheduledAt) > new Date()
        ).length

        // Check if team can be removed (no upcoming matches)
        const canRemove = upcomingMatches === 0

        return {
          id: leagueTeam.team.id,
          name: leagueTeam.team.name,
          sport: leagueTeam.team.sport,
          joinedAt: leagueTeam.joinedAt,
          memberCount: leagueTeam.team.members.length,
          adminCount: leagueTeam.team.members.filter(m => m.isAdmin).length,
          members: leagueTeam.team.members,
          stats: {
            totalMatches: matches.length,
            completedMatches: completedMatches.length,
            wins,
            losses,
            ties,
            upcomingMatches,
            winPercentage: completedMatches.length > 0 ? 
              Math.round((wins / completedMatches.length) * 100) : 0
          },
          canRemove: canRemove
        }
      })
    )

    const isManager = league.creatorId === user.id

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
        sport: league.sport,
        isManager: isManager
      },
      teams: teamsWithStats,
      totalTeams: teamsWithStats.length
    })

  } catch (error) {
    console.error('Error fetching league teams:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}