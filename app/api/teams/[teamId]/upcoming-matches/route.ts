import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await params

    // Check if user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        user: { email: session.user.email }
      }
    })

    if (!teamMember) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
    }

    // Get upcoming matches for the team, excluding archived seasons
    const upcomingMatches = await prisma.seasonMatch.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        scheduledAt: {
          gte: new Date() // Only future matches
        },
        status: {
          in: ['SCHEDULED', 'POSTPONED']
        },
        season: {
          status: {
            in: ['DRAFT', 'ACTIVE', 'COMPLETED']
          }
        }
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        season: {
          include: {
            league: true
          }
        },
        // We'll get availability separately
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    })

    // Get user information for availability lookup
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    // Get availability for each match
    const matchesWithAvailability = await Promise.all(
      upcomingMatches.map(async (match) => {
        const availability = await prisma.seasonMatchAvailability.findFirst({
          where: {
            seasonMatchId: match.id,
            userId: user?.id
          }
        })
        return {
          ...match,
          userAvailability: availability
        }
      })
    )

    return NextResponse.json({ matches: matchesWithAvailability })

  } catch (error) {
    console.error('Error fetching upcoming matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upcoming matches' },
      { status: 500 }
    )
  }
}