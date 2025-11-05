import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSeasonStandings } from '@/lib/standings'

// GET /api/leagues/[leagueId]/seasons/[seasonId]/standings - Get season standings
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

    // Verify season exists and belongs to the league
    const season = await prisma.season.findFirst({
      where: {
        id: seasonId,
        leagueId
      },
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

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Calculate current standings from completed matches
    const standings = await calculateSeasonStandings(seasonId)

    // Get team member information for display
    const teamsWithMembers = await prisma.team.findMany({
      where: {
        id: { in: standings.map(s => s.teamId) }
      },
      select: {
        id: true,
        name: true,
        sport: true,
        members: {
          select: {
            id: true,
            isAdmin: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Transform to match expected format with team member info
    const transformedStandings = standings.map((standing) => {
      const teamInfo = teamsWithMembers.find(t => t.id === standing.teamId)
      return {
        teamId: standing.teamId,
        teamName: standing.teamName,
        gamesPlayed: standing.played,
        wins: standing.won,
        losses: standing.lost,
        draws: standing.drawn,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        winPercentage: standing.played > 0 ? (standing.won / standing.played) * 100 : 0,
        members: teamInfo?.members.map(member => ({
          id: member.user.id,
          name: member.user.name || member.user.email,
          email: member.user.email,
          isAdmin: member.isAdmin
        })) || []
      }
    })

    return NextResponse.json({
      standings: transformedStandings,
      season: {
        id: season.id,
        name: season.name,
        status: season.status
      },
      league: season.league
    })

  } catch (error) {
    console.error('Error fetching season standings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}