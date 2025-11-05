import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const TOURNAMENT_FORMATS = ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'TRIPLE_ELIMINATION'] as const

export async function GET(req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId } = await params

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tournament with full details
    const tournament = await (prisma as any).tournament.findUnique({
      where: { id: tournamentId },
      include: {
        league: {
          select: { id: true, name: true, creatorId: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        teams: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          },
          orderBy: { seed: 'asc' }
        },
        rounds: {
          include: {
            matches: {
              include: {
                homeTeam: {
                  include: {
                    team: {
                      select: { id: true, name: true }
                    }
                  }
                },
                awayTeam: {
                  include: {
                    team: {
                      select: { id: true, name: true }
                    }
                  }
                }
              },
              orderBy: { matchNumber: 'asc' }
            }
          },
          orderBy: { roundNumber: 'asc' }
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
        }
      }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

  console.log(`[API GET Tournament] Rounds:`, tournament.rounds.map((r: any) => ({
      name: r.name,
      number: r.roundNumber,
      matches: r.matches.length
    })))

    // Verify user has access to this tournament (is member of a team in the league)
    const userTeamInLeague = await prisma.leagueTeam.findFirst({
      where: {
        leagueId: tournament.league.id,
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

    return NextResponse.json({ tournament })
  } catch (error) {
    console.error('Error fetching tournament:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId } = await params
    const body = await req.json()
    const { name, description, format, hasConsolationBracket, maxTeams } = body

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tournament to verify permissions
    const existingTournament = await (prisma as any).tournament.findUnique({
      where: { id: tournamentId },
      include: {
        league: {
          select: { id: true, creatorId: true }
        }
      }
    })

    if (!existingTournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check if user is league manager or tournament creator
    const isLeagueManager = existingTournament.league.creatorId === user.id
    const isTournamentCreator = existingTournament.createdById === user.id

    if (!isLeagueManager && !isTournamentCreator) {
      return NextResponse.json({ error: 'Only league managers or tournament creators can update tournaments' }, { status: 403 })
    }

    // Validate tournament format if provided
    if (format && !TOURNAMENT_FORMATS.includes(format)) {
      return NextResponse.json({ error: 'Invalid tournament format' }, { status: 400 })
    }

    // Update tournament
    const tournament = await (prisma as any).tournament.update({
      where: { id: tournamentId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(format && { format }),
        ...(hasConsolationBracket !== undefined && { hasConsolationBracket }),
        ...(maxTeams !== undefined && { maxTeams })
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

    return NextResponse.json({ tournament })
  } catch (error) {
    console.error('Error updating tournament:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId } = await params

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tournament to verify permissions
    const tournament = await (prisma as any).tournament.findUnique({
      where: { id: tournamentId },
      include: {
        league: {
          select: { id: true, creatorId: true }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check if user is league manager
    const isLeagueManager = tournament.league.creatorId === user.id

    if (!isLeagueManager) {
      return NextResponse.json({ error: 'Only league managers can delete tournaments' }, { status: 403 })
    }

    // Delete tournament (cascade will handle related records)
    await (prisma as any).tournament.delete({
      where: { id: tournamentId }
    })

    return NextResponse.json({ message: 'Tournament deleted successfully' })
  } catch (error) {
    console.error('Error deleting tournament:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}