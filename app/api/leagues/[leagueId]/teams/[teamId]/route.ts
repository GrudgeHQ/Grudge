import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/leagues/[leagueId]/teams/[teamId] - Remove a team from the league
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; teamId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, teamId } = await params

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify the league exists and user is the manager
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        creatorId: true,
        sport: true
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Check if the user is the league manager (creator)
    if (league.creatorId !== user.id) {
      return NextResponse.json({ 
        error: 'Only the league manager can remove teams from the league' 
      }, { status: 403 })
    }

    // Verify the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        sport: true,
        members: {
          where: { isAdmin: true },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if the team is actually in this league
    const leagueTeam = await prisma.leagueTeam.findUnique({
      where: {
        leagueId_teamId: {
          leagueId: leagueId,
          teamId: teamId
        }
      }
    })

    if (!leagueTeam) {
      return NextResponse.json({ 
        error: 'Team is not a member of this league' 
      }, { status: 400 })
    }

    // Check if removing this team would affect any existing matches
    const upcomingMatches = await prisma.leagueMatch.findFirst({
      where: {
        leagueId: leagueId,
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        scheduledAt: {
          gte: new Date()
        }
      }
    })

    if (upcomingMatches) {
      return NextResponse.json({ 
        error: 'Cannot remove team with upcoming matches. Please cancel or reschedule matches first.' 
      }, { status: 400 })
    }

    // Remove the team from the league
    await prisma.leagueTeam.delete({
      where: {
        leagueId_teamId: {
          leagueId: leagueId,
          teamId: teamId
        }
      }
    })

    // Send notifications to all team administrators
    if (team.members.length > 0) {
      const notifications = team.members.map((member: {
        user: { id: string; name?: string | null; email?: string | null }
        // Add any other member properties if needed
      }) => ({
        userId: member.user.id,
        type: 'team_removed_from_league',
        payload: {
          title: 'Team Removed from League',
          message: `Your team "${team.name}" has been removed from the league "${league.name}" by the league manager.`,
          teamId: team.id,
          teamName: team.name,
          leagueId: league.id,
          leagueName: league.name,
          removedBy: user.name || user.email
        }
      }))

      await prisma.notification.createMany({
        data: notifications
      })
    }

    return NextResponse.json({
      message: `Team "${team.name}" has been successfully removed from the league`,
      team: {
        id: team.id,
        name: team.name
      },
      league: {
        id: league.id,
        name: league.name
      },
      adminsNotified: team.members.length
    })

  } catch (error) {
    console.error('Error removing team from league:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET /api/leagues/[leagueId]/teams/[teamId] - Get team details in league context
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; teamId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, teamId } = await params

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has access to this league (is member of a team in the league or is the league manager)
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

    // Get team details in league context
    const teamInLeague = await prisma.leagueTeam.findUnique({
      where: {
        leagueId_teamId: {
          leagueId: leagueId,
          teamId: teamId
        }
      },
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
        },
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

    if (!teamInLeague) {
      return NextResponse.json({ 
        error: 'Team is not a member of this league' 
      }, { status: 404 })
    }

    // Get team's match statistics in this league
    const matchStats = await prisma.leagueMatch.findMany({
      where: {
        leagueId: leagueId,
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      },
      select: {
        id: true,
        scheduledAt: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true
      }
    })

    const wins = matchStats.filter((match: {
      id: string
      scheduledAt: Date | string | null
      homeTeamId: string
      awayTeamId: string
      homeScore: number | null
      awayScore: number | null
    }) => {
      if (match.homeScore === null || match.awayScore === null) return false
      if (match.homeTeamId === teamId) return match.homeScore > match.awayScore
      if (match.awayTeamId === teamId) return match.awayScore > match.homeScore
      return false
    }).length

    const losses = matchStats.filter((match: {
      id: string
      scheduledAt: Date | string | null
      homeTeamId: string
      awayTeamId: string
      homeScore: number | null
      awayScore: number | null
    }) => {
      if (match.homeScore === null || match.awayScore === null) return false
      if (match.homeTeamId === teamId) return match.homeScore < match.awayScore
      if (match.awayTeamId === teamId) return match.awayScore < match.homeScore
      return false
    }).length

    const ties = matchStats.filter((match: {
      id: string
      scheduledAt: Date | string | null
      homeTeamId: string
      awayTeamId: string
      homeScore: number | null
      awayScore: number | null
    }) => {
      if (match.homeScore === null || match.awayScore === null) return false
      return match.homeScore === match.awayScore
    }).length

    return NextResponse.json({
      team: teamInLeague.team,
      league: teamInLeague.league,
      joinedAt: teamInLeague.joinedAt,
      stats: {
        totalMatches: matchStats.length,
        wins,
        losses,
        ties,
        upcomingMatches: matchStats.filter((match: {
          id: string
          scheduledAt: Date | string | null
          homeTeamId: string
          awayTeamId: string
          homeScore: number | null
          awayScore: number | null
        }) => 
          new Date(match.scheduledAt ?? '') > new Date()
        ).length
      },
      isManager: teamInLeague.league.creatorId === user.id
    })

  } catch (error) {
    console.error('Error fetching team details:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}