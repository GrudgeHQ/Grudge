import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; seasonId: string; matchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, seasonId, matchId } = await params
    const body = await request.json()
    const { homeScore, awayScore, status } = body

    // Verify user is league manager
    const league = await prisma.league.findFirst({
      where: {
        id: leagueId,
        creatorId: userId
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'Not authorized to manage this league' }, { status: 403 })
    }

    // Verify the season exists and belongs to the league
    const season = await prisma.season.findFirst({
      where: {
        id: seasonId,
        leagueId: leagueId
      }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Update the match
    const updatedMatch = await prisma.seasonMatch.update({
      where: {
        id: matchId,
        seasonId: seasonId
      },
      data: {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        status: status || 'COMPLETED'
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    })

    // Always update standings if scores are submitted and match is not already completed
    if (
      typeof homeScore !== 'undefined' && typeof awayScore !== 'undefined' &&
      (updatedMatch.status === 'COMPLETED' || status === 'COMPLETED' || status === undefined)
    ) {
      await updateStandings(seasonId, updatedMatch)
    }

    return NextResponse.json(updatedMatch)
  } catch (error) {
    console.error('Failed to update match:', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}

async function updateStandings(seasonId: string, match: any) {
  const homeScore = match.homeScore
  const awayScore = match.awayScore
  
  // Determine match result
  let homeWin = 0, homeDraw = 0, homeLoss = 0
  let awayWin = 0, awayDraw = 0, awayLoss = 0
  let homePoints = 0, awayPoints = 0

  if (homeScore > awayScore) {
    homeWin = 1
    awayLoss = 1
    homePoints = 3
    awayPoints = 0
  } else if (homeScore < awayScore) {
    homeLoss = 1
    awayWin = 1
    homePoints = 0
    awayPoints = 3
  } else {
    homeDraw = 1
    awayDraw = 1
    homePoints = 1
    awayPoints = 1
  }

  // Calculate goal difference for home team
  const homeGoalDiff = homeScore - awayScore
  const awayGoalDiff = awayScore - homeScore

  // Update home team standings
  const homeStanding = await prisma.seasonStanding.upsert({
    where: {
      seasonId_teamId: {
        seasonId: seasonId,
        teamId: match.homeTeamId
      }
    },
    update: {
      wins: { increment: homeWin },
      draws: { increment: homeDraw },
      losses: { increment: homeLoss },
      gamesPlayed: { increment: 1 },
      goalsFor: { increment: homeScore },
      goalsAgainst: { increment: awayScore },
      goalDifference: { increment: homeGoalDiff },
      points: { increment: homePoints }
    },
    create: {
      seasonId: seasonId,
      teamId: match.homeTeamId,
      wins: homeWin,
      draws: homeDraw,
      losses: homeLoss,
      gamesPlayed: 1,
      goalsFor: homeScore,
      goalsAgainst: awayScore,
      goalDifference: homeGoalDiff,
      points: homePoints,
      position: 1,
      winPercentage: homeWin > 0 ? 100.0 : 0.0
    }
  })

  // Calculate win percentage for home team
  const homeWinPct = homeStanding.gamesPlayed > 0 
    ? (homeStanding.wins / homeStanding.gamesPlayed) * 100 
    : 0
  
  await prisma.seasonStanding.update({
    where: { id: homeStanding.id },
    data: { winPercentage: homeWinPct }
  })

  // Update away team standings
  const awayStanding = await prisma.seasonStanding.upsert({
    where: {
      seasonId_teamId: {
        seasonId: seasonId,
        teamId: match.awayTeamId
      }
    },
    update: {
      wins: { increment: awayWin },
      draws: { increment: awayDraw },
      losses: { increment: awayLoss },
      gamesPlayed: { increment: 1 },
      goalsFor: { increment: awayScore },
      goalsAgainst: { increment: homeScore },
      goalDifference: { increment: awayGoalDiff },
      points: { increment: awayPoints }
    },
    create: {
      seasonId: seasonId,
      teamId: match.awayTeamId,
      wins: awayWin,
      draws: awayDraw,
      losses: awayLoss,
      gamesPlayed: 1,
      goalsFor: awayScore,
      goalsAgainst: homeScore,
      goalDifference: awayGoalDiff,
      points: awayPoints,
      position: 1,
      winPercentage: awayWin > 0 ? 100.0 : 0.0
    }
  })

  // Calculate win percentage for away team
  const awayWinPct = awayStanding.gamesPlayed > 0 
    ? (awayStanding.wins / awayStanding.gamesPlayed) * 100 
    : 0
  
  await prisma.seasonStanding.update({
    where: { id: awayStanding.id },
    data: { winPercentage: awayWinPct }
  })
}