import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/leagues/[leagueId] - Get a specific league
export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      creator: {
        select: {
          id: true,
          name: true
        }
      },
      teams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              sport: true,
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                },
                orderBy: [
                  { isAdmin: 'desc' },
                  { user: { name: 'asc' } }
                ]
              }
            }
          }
        }
      },
      seasons: {
        where: {
          status: {
            in: ['DRAFT', 'ACTIVE', 'COMPLETED']
          }
        },
        include: {
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
            orderBy: {
              scheduledAt: 'asc'
            }
          }
        }
      },
      tournaments: {
        select: {
          id: true,
          name: true,
          format: true,
          status: true,
          maxTeams: true,
          startedAt: true,
          completedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Transform the data to match the frontend expectations
  // Flatten season matches into a matches array (SeasonMatches are the actual league matches)
  // Filter out matches without valid scheduled dates
  const matches = league.seasons.flatMap((season: any) => 
    season.seasonMatches
  .filter((match: any) => match.scheduledAt !== null) // Only include matches with valid dates
  .map((match: any) => ({
        id: match.id,
        scheduledAt: match.scheduledAt,
        location: match.location,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status
      }))
  )

  // Transform league data to match frontend interface
  const transformedLeague = {
    ...league,
    matches,
    // Keep seasons for other functionality but matches are now flattened
    seasons: league.seasons
  }

  return NextResponse.json({ league: transformedLeague })
}

// PATCH /api/leagues/[leagueId] - Update a league (creator only)
export async function PATCH(
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

  const league = await prisma.league.findUnique({
    where: { id: leagueId }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Only creator can edit
  if (league.creatorId !== user.id) {
    return NextResponse.json({ error: 'Only the League Manager can edit this league' }, { status: 403 })
  }

  const body = await request.json()
  const { name, sport } = body

  if (!name || !sport) {
    return NextResponse.json({ error: 'Name and sport are required' }, { status: 400 })
  }

  // Validate sport enum
  const validSports = [
    'SOCCER', 'BASKETBALL', 'BASEBALL', 'FOOTBALL', 'VOLLEYBALL', 'TENNIS', 
    'BADMINTON', 'RUGBY', 'HOCKEY', 'ICE_HOCKEY', 'FIELD_HOCKEY', 'LACROSSE', 
    'CRICKET', 'GOLF', 'SWIMMING', 'TRACK', 'CYCLING', 'BOXING', 'MMA', 
    'WRESTLING', 'TABLE_TENNIS', 'SQUASH', 'PICKLEBALL', 'HANDBALL', 'SKIING', 
    'SNOWBOARDING', 'SURFING', 'ROWING', 'SAILING', 'KAYAKING', 'BOWLING', 
    'DODGEBALL', 'KICKBALL', 'ULTIMATE_FRISBEE', 'WATER_POLO', 'POLO', 
    'PING_PONG'
  ]
  
  if (!validSports.includes(sport)) {
    return NextResponse.json({ error: 'Invalid sport selected' }, { status: 400 })
  }

  const updatedLeague = await prisma.league.update({
    where: { id: leagueId },
    data: {
      name: name.trim(),
      sport
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return NextResponse.json({ league: updatedLeague })
}

// DELETE /api/leagues/[leagueId] - Delete a league (creator only)
export async function DELETE(
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

  const league = await prisma.league.findUnique({
    where: { id: leagueId }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Only League Manager can delete
  if (league.creatorId !== user.id) {
    return NextResponse.json({ error: 'Only the League Manager can delete this league' }, { status: 403 })
  }

  await prisma.league.delete({
    where: { id: leagueId }
  })

  return NextResponse.json({ success: true })
}
