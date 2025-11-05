import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/leagues/[leagueId]/schedule - Schedule a match between two teams in the league
export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
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

  const { homeTeamId, awayTeamId, scheduledAt, location } = await request.json()

  if (!homeTeamId || !awayTeamId || !scheduledAt) {
    return NextResponse.json({ 
      error: 'Home team, away team, and scheduled time are required' 
    }, { status: 400 })
  }

  if (homeTeamId === awayTeamId) {
    return NextResponse.json({ error: 'Home and away teams must be different' }, { status: 400 })
  }

  // Verify the league exists and get current season
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: true,
      seasons: {
        where: {
          status: {
            not: 'COMPLETED'
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Get or create current season for the league
  let currentSeason = league.seasons[0]
  if (!currentSeason) {
    // Create a default season if none exists
    currentSeason = await prisma.season.create({
      data: {
        name: `${new Date().getFullYear()} Season`,
        leagueId,
        scheduleType: 'ROUND_ROBIN',
        status: 'ACTIVE',
        createdById: user.id
      }
    })
  }

  // Verify both teams are in the league
  const homeTeamInLeague = league.teams.some((t: any) => t.teamId === homeTeamId)
  const awayTeamInLeague = league.teams.some((t: any) => t.teamId === awayTeamId)

  if (!homeTeamInLeague || !awayTeamInLeague) {
    return NextResponse.json({ 
      error: 'Both teams must be members of this league' 
    }, { status: 400 })
  }

  // Verify user is the league manager (creator)
  if (league.creatorId !== user.id) {
    return NextResponse.json({ 
      error: 'Only the league manager can schedule matches for all teams' 
    }, { status: 403 })
  }

  // Create the season match (league matches are organized by seasons)
  const seasonMatch = await prisma.seasonMatch.create({
    data: {
      seasonId: currentSeason.id,
      homeTeamId,
      awayTeamId,
      scheduledAt: new Date(scheduledAt),
      location: location || null,
      status: 'SCHEDULED',
      createdById: user.id
    }
  })

  // Create corresponding Match records for both teams (for team-specific views)
  // Home team match
  await prisma.match.create({
    data: {
      teamId: homeTeamId,
      opponentTeamId: awayTeamId,
      scheduledAt: new Date(scheduledAt),
      location: location || null,
      matchType: 'LEAGUE_MATCH',
      leagueId,
      createdById: user.id
    }
  })

  // Away team match
  await prisma.match.create({
    data: {
      teamId: awayTeamId,
      opponentTeamId: homeTeamId,
      scheduledAt: new Date(scheduledAt),
      location: location || null,
      matchType: 'LEAGUE_MATCH',
      leagueId,
      createdById: user.id
    }
  })

  // Return the season match with team details
  const createdMatch = await prisma.seasonMatch.findUnique({
    where: { id: seasonMatch.id },
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
    }
  })

  return NextResponse.json({ match: createdMatch })
}
