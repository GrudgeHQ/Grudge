import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params

    // Get all season matches for this league
    const seasonMatches = await prisma.seasonMatch.findMany({
      where: {
        season: {
          leagueId: leagueId,
        },
        // Only get matches that have been scheduled (past date)
        scheduledAt: {
          lt: new Date(),
        },
      },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
            leagueId: true,
          },
        },
        scoreSubmissions: {
          where: {
            status: 'pending',
          },
          include: {
            submittedBy: {
              select: {
                name: true,
                email: true,
              },
            },
            submittingTeam: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            submittedAt: 'desc',
          },
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    })

    // Separate into categories
    const pendingSubmissions = seasonMatches
  .filter((match: any) => match.scoreSubmissions.length > 0)
  .map((match: any) => ({
        ...match.scoreSubmissions[0],
        seasonMatch: {
          id: match.id,
          scheduledAt: match.scheduledAt,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status,
        },
      }))

    const unrecordedMatches = seasonMatches.filter(
  (match: any) =>
        match.status === 'SCHEDULED' &&
        match.scoreSubmissions.length === 0 &&
        match.homeScore === null &&
        match.awayScore === null
    )

    return NextResponse.json({
      pendingSubmissions,
      unrecordedMatches,
    })
  } catch (error: any) {
    console.error('Error fetching scores dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scores dashboard data' },
      { status: 500 }
    )
  }
}
