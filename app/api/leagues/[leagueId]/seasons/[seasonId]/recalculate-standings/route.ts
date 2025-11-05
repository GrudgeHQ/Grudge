import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; seasonId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, seasonId } = await params

    // Get user information
    const user = await (prisma as any).user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is league manager
    const league = await (prisma as any).league.findFirst({
      where: {
        id: leagueId,
        creatorId: user.id
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'Not authorized to manage this league' }, { status: 403 })
    }

    // Verify the season exists
    const season = await (prisma as any).season.findFirst({
      where: {
        id: seasonId,
        leagueId: leagueId
      },
      include: {
        seasonTeams: {
          include: {
            team: true
          }
        }
      }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Get all completed matches for this season
    const matches = await (prisma as any).seasonMatch.findMany({
      where: {
        seasonId: seasonId,
        status: 'CONFIRMED',
        homeScore: { not: null },
        awayScore: { not: null }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    })

    // Clear existing standings
    await (prisma as any).seasonStanding.deleteMany({
      where: { seasonId: seasonId }
    })

    // Initialize standings for all teams
    const standings: Record<string, any> = {}
    for (const st of season.seasonTeams) {
      standings[st.teamId] = {
        teamId: st.teamId,
        wins: 0,
        draws: 0,
        losses: 0,
        gamesPlayed: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      }
    }

    // Process each match
    for (const match of matches) {
      const homeScore = match.homeScore || 0
      const awayScore = match.awayScore || 0

      // Initialize team standings if they don't exist
      if (!standings[match.homeTeamId]) {
        standings[match.homeTeamId] = {
          teamId: match.homeTeamId,
          wins: 0,
          draws: 0,
          losses: 0,
          gamesPlayed: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        }
      }
      if (!standings[match.awayTeamId]) {
        standings[match.awayTeamId] = {
          teamId: match.awayTeamId,
          wins: 0,
          draws: 0,
          losses: 0,
          gamesPlayed: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        }
      }

      // Update home team stats
      standings[match.homeTeamId].gamesPlayed++
      standings[match.homeTeamId].goalsFor += homeScore
      standings[match.homeTeamId].goalsAgainst += awayScore
      standings[match.homeTeamId].goalDifference += (homeScore - awayScore)

      // Update away team stats
      standings[match.awayTeamId].gamesPlayed++
      standings[match.awayTeamId].goalsFor += awayScore
      standings[match.awayTeamId].goalsAgainst += homeScore
      standings[match.awayTeamId].goalDifference += (awayScore - homeScore)

      // Determine winner and update points
      if (homeScore > awayScore) {
        standings[match.homeTeamId].wins++
        standings[match.homeTeamId].points += 3
        standings[match.awayTeamId].losses++
      } else if (awayScore > homeScore) {
        standings[match.awayTeamId].wins++
        standings[match.awayTeamId].points += 3
        standings[match.homeTeamId].losses++
      } else {
        standings[match.homeTeamId].draws++
        standings[match.homeTeamId].points += 1
        standings[match.awayTeamId].draws++
        standings[match.awayTeamId].points += 1
      }
    }

    // Sort teams by points, then goal difference, then goals for
    const sortedStandings = Object.values(standings).sort((a: any, b: any) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      return b.goalsFor - a.goalsFor
    })

    // Create standings records with position
    const createdStandings = await Promise.all(
      sortedStandings.map((standing: any, index) => {
        const winPercentage = standing.gamesPlayed > 0 
          ? (standing.wins / standing.gamesPlayed) * 100 
          : 0

        return (prisma as any).seasonStanding.create({
          data: {
            seasonId: seasonId,
            teamId: standing.teamId,
            position: index + 1,
            wins: standing.wins,
            draws: standing.draws,
            losses: standing.losses,
            gamesPlayed: standing.gamesPlayed,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            goalDifference: standing.goalDifference,
            points: standing.points,
            winPercentage: winPercentage
          }
        })
      })
    )

    return NextResponse.json({
      message: `Standings recalculated successfully for ${createdStandings.length} teams based on ${matches.length} matches`,
      standings: createdStandings
    })
  } catch (error: any) {
    console.error('Failed to recalculate standings:', error)
    return NextResponse.json({ 
      error: 'Failed to recalculate standings',
      details: error?.message 
    }, { status: 500 })
  }
}
