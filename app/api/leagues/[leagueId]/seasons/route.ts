import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Helper function to generate season matches
async function generateSeasonMatches(
  seasonId: string,
  teamIds: string[],
  scheduleType: Prisma.SeasonScheduleType,
  createdById: string,
  gamesPerOpponent?: number,
  totalGamesPerTeam?: number
) {
  const matches = []

  if (scheduleType === Prisma.SeasonScheduleType.ROUND_ROBIN) {
    // Generate round-robin matches
    const rounds = gamesPerOpponent || 1
    
    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          matches.push({
            seasonId,
            homeTeamId: teamIds[i],
            awayTeamId: teamIds[j],
            status: Prisma.SeasonMatchStatus.SCHEDULED,
            createdById,
            round: round + 1
          })
          
          // If more than 1 round, create return fixtures
          if (rounds > 1 && round > 0) {
            matches.push({
              seasonId,
              homeTeamId: teamIds[j], // Swap home/away for return fixture
              awayTeamId: teamIds[i],
              status: Prisma.SeasonMatchStatus.SCHEDULED,
              createdById,
              round: round + 1
            })
          }
        }
      }
    }
  } else if (scheduleType === Prisma.SeasonScheduleType.FIXED_GAMES) {
    // Generate fixed number of games per team
    const gamesPerTeam = totalGamesPerTeam || 1
    const totalTeams = teamIds.length
    
    // Simple random pairing for fixed games
    for (let game = 0; game < Math.floor(gamesPerTeam / 2) * totalTeams; game++) {
      const homeIndex = Math.floor(Math.random() * totalTeams)
      let awayIndex = Math.floor(Math.random() * totalTeams)
      
      // Ensure different teams
      while (awayIndex === homeIndex) {
        awayIndex = Math.floor(Math.random() * totalTeams)
      }
      
      matches.push({
        seasonId,
        homeTeamId: teamIds[homeIndex],
        awayTeamId: teamIds[awayIndex],
        status: Prisma.SeasonMatchStatus.SCHEDULED,
        createdById,
        round: Math.floor(game / (totalTeams / 2)) + 1
      })
    }
  }

  // Create all matches in the database
  if (matches.length > 0) {
    await prisma.seasonMatch.createMany({
      data: matches
    })
  }
}

// GET /api/leagues/[leagueId]/seasons - Get all seasons for a league
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

    // Verify league exists and user has access (member of league or league manager)
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          include: {
            team: {
              include: {
                members: {
                  where: { userId: user.id }
                }
              }
            }
          }
        }
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Check if user is league manager or member of a team in the league
    const isLeagueManager = league.creatorId === user.id
    const isMember = league.teams.some((lt: any) => lt.team.members.length > 0)

    if (!isLeagueManager && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get seasons for this league
    const seasons = await prisma.season.findMany({
      where: { leagueId },
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
            scheduledAt: true
          }
        },
        seasonStandings: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        tournament: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ 
      seasons, 
      isLeagueManager,
      league: {
        id: league.id,
        name: league.name,
        sport: league.sport
      }
    })

  } catch (error) {
    console.error('Error fetching seasons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/leagues/[leagueId]/seasons - Create a new season
export async function POST(
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

    // Verify user is league manager
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only league managers can create seasons' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      scheduleType,
      gamesPerOpponent,
      totalGamesPerTeam,
      startDate,
      endDate,
      hasTournament,
      tournamentName,
      tournamentStartDate,
      description,
      rules,
      selectedTeams // Array of team IDs to include in the season
    } = body

    // Validation
    if (!name || !scheduleType) {
      return NextResponse.json({ error: 'Name and schedule type are required' }, { status: 400 })
    }

  if (!['ROUND_ROBIN', 'FIXED_GAMES'].includes(scheduleType)) {
      return NextResponse.json({ error: 'Invalid schedule type' }, { status: 400 })
    }

  if (scheduleType === 'ROUND_ROBIN' && (!gamesPerOpponent || gamesPerOpponent < 1 || gamesPerOpponent > 10)) {
      return NextResponse.json({ error: 'Games per opponent must be between 1 and 10 for round robin' }, { status: 400 })
    }

  if (scheduleType === 'FIXED_GAMES' && (!totalGamesPerTeam || totalGamesPerTeam < 1)) {
      return NextResponse.json({ error: 'Total games per team must be at least 1 for fixed games' }, { status: 400 })
    }

    if (!selectedTeams || !Array.isArray(selectedTeams) || selectedTeams.length < 2) {
      return NextResponse.json({ error: 'At least 2 teams must be selected for a season' }, { status: 400 })
    }

    // Verify all selected teams are in the league
  const leagueTeamIds = league.teams.map((lt: { team: { id: string } }) => lt.team.id)
    const invalidTeams = selectedTeams.filter(teamId => !leagueTeamIds.includes(teamId))
    
    if (invalidTeams.length > 0) {
      return NextResponse.json({ error: 'Some selected teams are not in this league' }, { status: 400 })
    }

    // Create the season
    const season = await prisma.season.create({
      data: {
        name,
        leagueId,
    scheduleType,
    gamesPerOpponent: scheduleType === 'ROUND_ROBIN' ? gamesPerOpponent : null,
    totalGamesPerTeam: scheduleType === 'FIXED_GAMES' ? totalGamesPerTeam : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        hasTournament,
        tournamentName: hasTournament ? tournamentName : null,
        tournamentStartDate: hasTournament && tournamentStartDate ? new Date(tournamentStartDate) : null,
        description,
        rules,
  status: 'DRAFT',
        createdById: user.id,
        seasonTeams: {
          create: selectedTeams.map((teamId: string) => ({
            teamId
          }))
        }
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
        }
      }
    })

    // Create initial standings for all teams
    await prisma.seasonStanding.createMany({
      data: selectedTeams.map((teamId: string, index: number) => ({
        seasonId: season.id,
        teamId,
        position: index + 1
      }))
    })

    // Generate matches based on schedule type
    await generateSeasonMatches(season.id, selectedTeams, scheduleType, user.id, gamesPerOpponent, totalGamesPerTeam)

    return NextResponse.json({ season })

  } catch (error) {
    console.error('Error creating season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}