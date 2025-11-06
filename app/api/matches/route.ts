import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { teamId, opponentName, opponentTeamId, scheduledAt, location, requiredPlayers, isLeagueMatch, leagueId } = body
  if (!teamId || !scheduledAt) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // caller must be admin
  const caller = await prisma.teamMember.findFirst({ where: { teamId, user: { email: session.user.email } } })
  if (!caller || !caller.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Team administrators can only create external matches, not league matches
  if (isLeagueMatch) {
    return NextResponse.json({ 
      error: 'Team administrators cannot create league matches. Only league managers can schedule league matches. You can still create regular matches against external teams.' 
    }, { status: 403 })
  }

  // For external matches, allow either opponent team ID or opponent name
  if (!opponentTeamId && !opponentName) {
    return NextResponse.json({ error: 'External matches require either an opponent team or opponent name' }, { status: 400 })
  }

  // If both teams are in the same league, ensure this is a head-to-head match between league teams
  if (leagueId && opponentTeamId) {
    // Verify both teams are in the specified league (only if opponent is also a team)
    const homeTeamInLeague = await prisma.leagueTeam.findFirst({
      where: { teamId, leagueId }
    })
    const awayTeamInLeague = await prisma.leagueTeam.findFirst({
      where: { teamId: opponentTeamId, leagueId }
    })

    if (!homeTeamInLeague || !awayTeamInLeague) {
      return NextResponse.json({ error: 'Both teams must be in the specified league for league-related matches' }, { status: 400 })
    }
  }

  // Create external match
  const match = await prisma.match.create({
    data: {
      teamId,
      opponentName: opponentName ?? null,
      opponentTeamId: opponentTeamId ?? null,
      scheduledAt: new Date(scheduledAt),
      location: location ?? null,
      requiredPlayers: requiredPlayers ?? null,
      createdById: caller.userId,


    }
  })
  return NextResponse.json({ ok: true, match })
}

export async function GET(req: Request) {
  // optional teamId query param
  const url = new URL(req.url)
  const teamId = url.searchParams.get('teamId')
  if (teamId) {
    // Get regular matches
    const matches = await prisma.match.findMany({ 
      where: { teamId }, 
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        opponentTeam: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' } 
    })

    // Get season matches (league matches) for this team, excluding archived seasons
    const seasonMatches = await prisma.seasonMatch.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        season: {
          status: {
            in: ['DRAFT', 'ACTIVE', 'COMPLETED']
          }
        }
      },
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
        },
        season: {
          include: {
            league: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    })

    // Transform season matches to match the expected format, filtering out matches without dates
    const transformedSeasonMatches = seasonMatches
      .filter((sm: typeof seasonMatches[number]) => sm.scheduledAt !== null) // Only include matches with valid dates
      .map((sm: typeof seasonMatches[number]) => ({
        id: sm.id,
        teamId: sm.homeTeamId === teamId ? sm.homeTeamId : sm.awayTeamId,
        opponentName: sm.homeTeamId === teamId ? sm.awayTeam.name : sm.homeTeam.name,
        opponentTeamId: sm.homeTeamId === teamId ? sm.awayTeamId : sm.homeTeamId,
        scheduledAt: sm.scheduledAt,
        location: sm.location,
        homeScore: sm.homeScore,
        awayScore: sm.awayScore,
        requiredPlayers: null,
        leagueMatchId: sm.id, // Mark as league match
        team: {
          id: sm.homeTeamId === teamId ? sm.homeTeam.id : sm.awayTeam.id,
          name: sm.homeTeamId === teamId ? sm.homeTeam.name : sm.awayTeam.name
        },
        opponentTeam: {
          id: sm.homeTeamId === teamId ? sm.awayTeam.id : sm.homeTeam.id,
          name: sm.homeTeamId === teamId ? sm.awayTeam.name : sm.homeTeam.name
        },
        league: sm.season.league,
        season: sm.season
      }))

    // Combine and sort all matches
    const allMatches = [...matches, ...transformedSeasonMatches].sort((a, b) => {
      const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
      const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
      return dateA - dateB
    })

    return NextResponse.json({ matches: allMatches })
  }
  
  // otherwise return upcoming matches for user's teams
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ matches: [] })
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  
  const memberships = await prisma.teamMember.findMany({ 
    where: { user: { email: session.user.email } }, 
    include: { team: true } 
  })
  const teamIds = memberships.map((m: typeof memberships[number]) => m.teamId)
  
  // Get regular matches
  const matches = await prisma.match.findMany({ 
    where: { teamId: { in: teamIds } }, 
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      },
      opponentTeam: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { scheduledAt: 'asc' } 
  })

  // Get season matches (league matches) for user's teams, excluding archived seasons
  const seasonMatches = await prisma.seasonMatch.findMany({
    where: {
      OR: [
        { homeTeamId: { in: teamIds } },
        { awayTeamId: { in: teamIds } }
      ],
      season: {
        status: {
          in: ['DRAFT', 'ACTIVE', 'COMPLETED']
        }
      }
    },
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
      },
      season: {
        include: {
          league: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { scheduledAt: 'asc' }
  })

  // Transform season matches to match the expected format, filtering out matches without dates
  const transformedSeasonMatches = seasonMatches
    .filter((sm: typeof seasonMatches[number]) => sm.scheduledAt !== null) // Only include matches with valid dates
    .map((sm: typeof seasonMatches[number]) => {
      // Determine which team is "home" for this user
  const userTeamId = teamIds.find((id: string) => id === sm.homeTeamId || id === sm.awayTeamId)
      const isHomeTeam = sm.homeTeamId === userTeamId
      
      return {
        id: sm.id,
        teamId: userTeamId,
        opponentName: isHomeTeam ? sm.awayTeam.name : sm.homeTeam.name,
        opponentTeamId: isHomeTeam ? sm.awayTeamId : sm.homeTeamId,
        scheduledAt: sm.scheduledAt,
        location: sm.location,
        homeScore: sm.homeScore,
        awayScore: sm.awayScore,
        requiredPlayers: null,
        leagueMatchId: sm.id, // Mark as league match
        team: {
          id: isHomeTeam ? sm.homeTeam.id : sm.awayTeam.id,
          name: isHomeTeam ? sm.homeTeam.name : sm.awayTeam.name
        },
        opponentTeam: {
          id: isHomeTeam ? sm.awayTeam.id : sm.homeTeam.id,
          name: isHomeTeam ? sm.awayTeam.name : sm.homeTeam.name
        },
        league: sm.season.league,
        season: sm.season
      }
    })

  // Combine and sort all matches
  const allMatches = [...matches, ...transformedSeasonMatches].sort((a, b) => {
    const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
    const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
    return dateA - dateB
  })
  
  return NextResponse.json({ matches: allMatches })
}
