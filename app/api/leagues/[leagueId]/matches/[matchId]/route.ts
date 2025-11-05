import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// PATCH /api/leagues/[leagueId]/matches/[matchId] - Edit a league match (league manager only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; matchId: string }> }
) {
  const { leagueId, matchId } = await params
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

  // Verify the league exists and user is the league manager
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: true
    }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  if (league.creatorId !== user.id) {
    return NextResponse.json({ 
      error: 'Only the league manager can edit league matches' 
    }, { status: 403 })
  }

  // Verify the match exists and belongs to this league (check season matches)
  const seasonMatch = await prisma.seasonMatch.findFirst({
    where: {
      id: matchId,
      season: {
        leagueId
      }
    },
    include: {
      season: true
    }
  })

  if (!seasonMatch) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Verify both teams are in the league
  const homeTeamInLeague = league.teams.some((t: any) => t.teamId === homeTeamId)
  const awayTeamInLeague = league.teams.some((t: any) => t.teamId === awayTeamId)

  if (!homeTeamInLeague || !awayTeamInLeague) {
    return NextResponse.json({ 
      error: 'Both teams must be members of this league' 
    }, { status: 400 })
  }

  // Update the season match
  const updatedSeasonMatch = await prisma.seasonMatch.update({
    where: { id: matchId },
    data: {
      homeTeamId,
      awayTeamId,
      scheduledAt: new Date(scheduledAt),
      location: location || null
    }
  })

  // Update the corresponding team Match records (find by team IDs and scheduled time)
  const oldTeamMatches = await prisma.match.findMany({
    where: {
      OR: [
        { teamId: seasonMatch.homeTeamId, opponentTeamId: seasonMatch.awayTeamId },
        { teamId: seasonMatch.awayTeamId, opponentTeamId: seasonMatch.homeTeamId }
      ],
      scheduledAt: seasonMatch.scheduledAt || undefined,
      matchType: 'LEAGUE_MATCH',
      leagueId
    }
  })

  // Delete old team matches
  if (oldTeamMatches.length > 0) {
    await prisma.match.deleteMany({
      where: {
        id: {
          in: oldTeamMatches.map(m => m.id)
        }
      }
    })
  }

  // Create new team matches with updated teams
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

  // Return the updated match with team details
  const updatedMatch = await prisma.seasonMatch.findUnique({
    where: { id: matchId },
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

  return NextResponse.json({ match: updatedMatch })
}

// DELETE /api/leagues/[leagueId]/matches/[matchId] - Delete a league match (league manager only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; matchId: string }> }
) {
  const { leagueId, matchId } = await params
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

  // Verify the league exists and user is the league manager
  const league = await prisma.league.findUnique({
    where: { id: leagueId }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  if (league.creatorId !== user.id) {
    return NextResponse.json({ 
      error: 'Only the league manager can delete league matches' 
    }, { status: 403 })
  }

  // Verify the match exists and belongs to this league (check season matches)
  const seasonMatch = await prisma.seasonMatch.findFirst({
    where: {
      id: matchId,
      season: {
        leagueId
      }
    }
  })

  if (!seasonMatch) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Delete associated team matches first (find by team IDs and scheduled time)
  await prisma.match.deleteMany({
    where: {
      OR: [
        { teamId: seasonMatch.homeTeamId, opponentTeamId: seasonMatch.awayTeamId },
        { teamId: seasonMatch.awayTeamId, opponentTeamId: seasonMatch.homeTeamId }
      ],
      scheduledAt: seasonMatch.scheduledAt || undefined,
      matchType: 'LEAGUE_MATCH',
      leagueId
    }
  })

  // Delete the season match
  await prisma.seasonMatch.delete({
    where: { id: matchId }
  })

  return NextResponse.json({ success: true })
}