import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Tournament format validation values
const TOURNAMENT_FORMATS = ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'TRIPLE_ELIMINATION'] as const

export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await params

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user has access to this league (is member of a team in the league)
    const userTeamInLeague = await prisma.leagueTeam.findFirst({
      where: {
        leagueId,
        team: {
          members: {
            some: { userId: user.id }
          }
        }
      }
    })

    if (!userTeamInLeague) {
      return NextResponse.json({ error: 'Access denied - not a member of this league' }, { status: 403 })
    }

    // Get tournaments for this league using raw query to work around typing issues
    const tournaments = await (prisma as any).tournament.findMany({
      where: { leagueId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        teams: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        },
        winner: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        },
        runnerUp: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        },
        thirdPlace: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        },
        rounds: {
          select: { id: true, roundNumber: true, name: true, isComplete: true, bracket: true }
        },
        matches: {
          select: { id: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ tournaments })
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await params
    const body = await req.json()
    const { name, description, format, hasConsolationBracket, randomByes, maxTeams, selectedTeams } = body

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify league exists and user is league manager
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

    // Check if user is league manager
    const isLeagueManager = league.creatorId === user.id

    if (!isLeagueManager) {
      return NextResponse.json({ error: 'Only league managers can create tournaments' }, { status: 403 })
    }

    // Validate tournament format
    if (!TOURNAMENT_FORMATS.includes(format)) {
      return NextResponse.json({ error: 'Invalid tournament format' }, { status: 400 })
    }

    // Validate selected teams are in the league
    if (selectedTeams && selectedTeams.length > 0) {
  const leagueTeamIds = league.teams.map((lt: typeof league.teams[number]) => lt.teamId)
      const invalidTeams = selectedTeams.filter((teamId: string) => !leagueTeamIds.includes(teamId))
      
      if (invalidTeams.length > 0) {
        return NextResponse.json({ error: 'Some selected teams are not in this league' }, { status: 400 })
      }
    }

    // Create tournament using raw query to work around typing issues
    const tournament = await (prisma as any).tournament.create({
      data: {
        name,
        description: description || null,
        format,
        hasConsolationBracket: hasConsolationBracket || false,
        randomByes: randomByes !== false, // Default to true
        maxTeams: maxTeams || null,
        leagueId,
        createdById: user.id,
        teams: selectedTeams && selectedTeams.length > 0 ? {
          create: selectedTeams.map((teamId: string, index: number) => ({
            teamId,
            seed: index + 1 // Simple seeding for now
          }))
        } : undefined
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        teams: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        },
        league: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({ tournament }, { status: 201 })
  } catch (error) {
    console.error('Error creating tournament:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}