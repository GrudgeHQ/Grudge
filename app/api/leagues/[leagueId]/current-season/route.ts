import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/leagues/[leagueId]/current-season - Get current active season
export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
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

    // Find the current active season (ACTIVE status takes priority, then most recent DRAFT)
    const activeSeason = await prisma.season.findFirst({
      where: {
        leagueId,
        status: 'ACTIVE'
      },
      include: {
        seasonTeams: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                sport: true
              }
            }
          }
        },
        seasonMatches: {
          select: {
            id: true,
            homeTeamId: true,
            awayTeamId: true,
            status: true,
            homeScore: true,
            awayScore: true,
            scheduledAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // If no active season, get the most recent draft season
    let currentSeason = activeSeason
    if (!currentSeason) {
      currentSeason = await prisma.season.findFirst({
        where: {
          leagueId,
          status: 'DRAFT'
        },
        include: {
          seasonTeams: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  sport: true
                }
              }
            }
          },
          seasonMatches: {
            select: {
              id: true,
              homeTeamId: true,
              awayTeamId: true,
              status: true,
              homeScore: true,
              awayScore: true,
              scheduledAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentSeason) {
      return NextResponse.json({ 
        currentSeason: null,
        message: 'No active or draft seasons found'
      })
    }

    return NextResponse.json({ 
      currentSeason: {
        id: currentSeason.id,
        name: currentSeason.name,
        status: currentSeason.status,
        scheduleType: currentSeason.scheduleType,
        startDate: currentSeason.startDate,
        endDate: currentSeason.endDate,
        teams: currentSeason.seasonTeams.map(st => st.team),
        matchCount: currentSeason.seasonMatches.length,
        completedMatches: currentSeason.seasonMatches.filter(m => m.status === 'COMPLETED').length
      }
    })

  } catch (error) {
    console.error('Error fetching current season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}