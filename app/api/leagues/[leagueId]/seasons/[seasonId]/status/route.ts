import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SeasonStatus } from '@prisma/client'

// PUT /api/leagues/[leagueId]/seasons/[seasonId]/status - Update season status
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
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only league managers can update season status' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    if (!Object.values(SeasonStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid season status' }, { status: 400 })
    }

    // Get the current season
    const currentSeason = await prisma.season.findFirst({
      where: {
        id: seasonId,
        leagueId
      }
    })

    if (!currentSeason) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Handle season status transitions
    if (status === SeasonStatus.ACTIVE) {
      // When activating a season, deactivate all other seasons in the league
      await prisma.season.updateMany({
        where: {
          leagueId,
          id: { not: seasonId },
          status: SeasonStatus.ACTIVE
        },
        data: {
          status: SeasonStatus.ARCHIVED
        }
      })

      // Reset all standings for the new active season
      await resetSeasonStandings(seasonId)
    } else if (status === SeasonStatus.COMPLETED) {
      // When completing a season, calculate final standings and potentially create new season
      await finalizeSeasonStandings(seasonId)
    } else if (status === SeasonStatus.ARCHIVED) {
      // Archive season - erase all standings for this season
      await prisma.seasonStanding.deleteMany({
        where: { seasonId }
      })
      // Archive all tournaments linked to this season
      // Prisma TournamentStatus enum does not have ARCHIVED, so use CANCELLED to indicate archived tournaments
      await prisma.tournament.updateMany({
        where: { seasonId },
        data: { status: 'CANCELLED' }
      })
    }

    // Update the season status
    const updatedSeason = await prisma.season.update({
      where: { id: seasonId },
      data: { 
        status
      }
    })

    return NextResponse.json({ 
      season: updatedSeason,
      message: `Season ${status.toLowerCase()} successfully`
    })

  } catch (error) {
    console.error('Error updating season status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to reset season standings when a season becomes active
async function resetSeasonStandings(seasonId: string) {
  try {
    // Get all teams in the season
    const seasonTeams = await prisma.seasonTeam.findMany({
      where: { seasonId }
    })

    // Reset all standings to zero
    await prisma.seasonStanding.updateMany({
      where: { seasonId },
      data: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        position: 1 // Reset positions, they'll be recalculated as matches are played
      }
    })

    console.log(`Reset standings for season ${seasonId}`)
  } catch (error) {
    console.error('Error resetting season standings:', error)
    throw error
  }
}

// Helper function to finalize season standings when season is completed
async function finalizeSeasonStandings(seasonId: string) {
  try {
    // Get current standings ordered by points, goal difference, goals for
    const standings = await prisma.seasonStanding.findMany({
      where: { seasonId },
      orderBy: [
        { points: 'desc' },
        { goalDifference: 'desc' },
        { goalsFor: 'desc' }
      ]
    })

    // Update final positions
    const updatePromises = standings.map((standing, index) =>
      prisma.seasonStanding.update({
        where: { id: standing.id },
        data: { position: index + 1 }
      })
    )

    await Promise.all(updatePromises)

    console.log(`Finalized standings for season ${seasonId}`)
  } catch (error) {
    console.error('Error finalizing season standings:', error)
    throw error
  }
}