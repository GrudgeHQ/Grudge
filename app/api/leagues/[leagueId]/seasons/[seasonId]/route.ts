import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/leagues/[leagueId]/seasons/[seasonId] - Get season details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; seasonId: string }> }
) {
  try {
    const { leagueId, seasonId } = await params
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

    // Get season with all details
    const season = await prisma.season.findUnique({
      where: { id: seasonId, leagueId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sport: true,
            creatorId: true
          }
        },
        seasonTeams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                sport: true,
                members: {
                  where: { userId: user.id },
                  select: { isAdmin: true }
                }
              }
            }
          }
        },
        seasonMatches: {
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true
              }
            },
            awayTeam: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { round: 'asc' },
            { scheduledAt: 'asc' }
          ]
        },
        seasonStandings: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { points: 'desc' },
            { goalDifference: 'desc' },
            { goalsFor: 'desc' }
          ]
        },
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Check if user has access (league manager or team member)
  const isLeagueManager = season.league.creatorId === user.id
  const isMember = season.seasonTeams.some((st: { team: { members: any[] } }) => st.team.members.length > 0)

    if (!isLeagueManager && !isMember) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ 
      season,
      isLeagueManager
    })

  } catch (error) {
    console.error('Error fetching season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/leagues/[leagueId]/seasons/[seasonId] - Update season
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; seasonId: string }> }
) {
  try {
    const { leagueId, seasonId } = await params
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

    // Verify user is league manager
    const season = await prisma.season.findUnique({
      where: { id: seasonId, leagueId },
      include: {
        league: true
      }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    if (season.league.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only league managers can update seasons' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...updateData } = body

    // Handle different actions
    if (action === 'start') {
      // Start the season
      if (season.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Only draft seasons can be started' }, { status: 400 })
      }

      const updatedSeason = await prisma.season.update({
        where: { id: seasonId },
        data: {
          status: 'ACTIVE',
          startDate: new Date()
        }
      })

      return NextResponse.json({ season: updatedSeason })
    }

    if (action === 'complete') {
      // Complete the season
      if (season.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Only active seasons can be completed' }, { status: 400 })
      }

      const updatedSeason = await prisma.season.update({
        where: { id: seasonId },
        data: {
          status: 'COMPLETED',
          endDate: new Date()
        }
      })

      return NextResponse.json({ season: updatedSeason })
    }

    if (action === 'archive') {
      // Archive the season
      if (season.status !== 'COMPLETED') {
        return NextResponse.json({ error: 'Only completed seasons can be archived' }, { status: 400 })
      }

      const updatedSeason = await prisma.season.update({
        where: { id: seasonId },
        data: {
          status: 'ARCHIVED'
        }
      })

      return NextResponse.json({ season: updatedSeason })
    }

    // Regular update (only for draft seasons)
    if (season.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only draft seasons can be edited' }, { status: 400 })
    }

    const {
      name,
      description,
      rules,
      startDate,
      endDate,
      hasTournament,
      tournamentName,
      tournamentStartDate
    } = updateData

    const updatedSeason = await prisma.season.update({
      where: { id: seasonId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(rules !== undefined && { rules }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(hasTournament !== undefined && { hasTournament }),
        ...(tournamentName !== undefined && { tournamentName }),
        ...(tournamentStartDate && { tournamentStartDate: new Date(tournamentStartDate) })
      }
    })

    return NextResponse.json({ season: updatedSeason })

  } catch (error) {
    console.error('Error updating season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/leagues/[leagueId]/seasons/[seasonId] - Delete season (only drafts)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; seasonId: string }> }
) {
  try {
    const { leagueId, seasonId } = await params
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

    // Verify user is league manager and season is in draft
    const season = await prisma.season.findUnique({
      where: { id: seasonId, leagueId },
      include: {
        league: true
      }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    if (season.league.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only league managers can delete seasons' }, { status: 403 })
    }

    // Allow deletion of any season status, but warn about active seasons
    if (season.status === 'ACTIVE') {
      console.log(`Warning: Deleting active season ${seasonId} with potential ongoing matches`)
    }

    // First, delete all related data explicitly to ensure complete cleanup
    // (cascade should handle most of this, but being explicit for data integrity)
    
    // Delete season match availability requests
    await prisma.seasonMatchAvailability.deleteMany({
      where: {
        seasonMatch: {
          seasonId: seasonId
        }
      }
    })

    // Delete season match score submissions
    await prisma.seasonMatchScoreSubmission.deleteMany({
      where: {
        seasonMatch: {
          seasonId: seasonId
        }
      }
    })

    // Get all season matches before deletion to clean up related team matches
    const seasonMatches = await prisma.seasonMatch.findMany({
      where: { seasonId: seasonId },
      select: { id: true, homeTeamId: true, awayTeamId: true, scheduledAt: true }
    })

    // Delete related team Match records that were created for league matches
    // These are identified by matchType: 'LEAGUE_MATCH' and matching team/time combinations
    for (const seasonMatch of seasonMatches) {
      // Delete team matches for both home and away teams
      await prisma.match.deleteMany({
        where: {
          OR: [
            {
              teamId: seasonMatch.homeTeamId,
              opponentTeamId: seasonMatch.awayTeamId,
              scheduledAt: seasonMatch.scheduledAt || undefined,
              matchType: 'LEAGUE_MATCH',
              leagueId: leagueId
            },
            {
              teamId: seasonMatch.awayTeamId,
              opponentTeamId: seasonMatch.homeTeamId,
              scheduledAt: seasonMatch.scheduledAt || undefined,
              matchType: 'LEAGUE_MATCH',
              leagueId: leagueId
            }
          ]
        }
      })
    }

    // Delete season matches
    await prisma.seasonMatch.deleteMany({
      where: { seasonId: seasonId }
    })

    // Delete season standings
    await prisma.seasonStanding.deleteMany({
      where: { seasonId: seasonId }
    })

    // Delete season teams
    await prisma.seasonTeam.deleteMany({
      where: { seasonId: seasonId }
    })

    // Handle tournaments that reference this season
    // Update tournaments to remove season reference (tournaments can be standalone)
    await (prisma as any).tournament.updateMany({
      where: { seasonId: seasonId },
      data: { seasonId: null }
    })

    // Finally, delete the season (cascade should have handled the above, but explicit cleanup ensures completeness)
    await prisma.season.delete({
      where: { id: seasonId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}