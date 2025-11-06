import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
  const session = (await getServerSession(authOptions as any)) as { user?: { email?: string } }
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId } = await params
    const body = await req.json()
    const { teamId, action } = body // action: 'add' or 'remove'

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tournament to verify permissions
  const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        league: {
          select: { id: true, creatorId: true },
          include: {
            teams: {
              select: { teamId: true }
            }
          }
        },
        teams: {
          select: { teamId: true, seed: true }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check if user is league manager
    const isLeagueManager = tournament.league.creatorId === user.id

    if (!isLeagueManager) {
      return NextResponse.json({ error: 'Only league managers can manage tournament teams' }, { status: 403 })
    }

    // Verify team is in the league
  const teamInLeague = tournament.league.teams.some((lt: { teamId: string }) => lt.teamId === teamId)
    if (!teamInLeague) {
      return NextResponse.json({ error: 'Team is not part of this league' }, { status: 400 })
    }

    if (action === 'add') {
      // Check if team is already in tournament
  const teamInTournament = tournament.teams.some((tt: { teamId: string }) => tt.teamId === teamId)
      if (teamInTournament) {
        return NextResponse.json({ error: 'Team is already in this tournament' }, { status: 400 })
      }

      // Check max teams limit
      if (tournament.maxTeams && tournament.teams.length >= tournament.maxTeams) {
        return NextResponse.json({ error: 'Tournament is full' }, { status: 400 })
      }

      // Add team to tournament
      const nextSeed = tournament.teams.length + 1
      const tournamentTeam = await (prisma as any).tournamentTeam.create({
        data: {
          tournamentId,
          teamId,
          seed: nextSeed
        },
        include: {
          team: {
            select: { id: true, name: true }
          }
        }
      })

      return NextResponse.json({ tournamentTeam }, { status: 201 })
    } else if (action === 'remove') {
      // Check if team is in tournament
  const teamInTournament = tournament.teams.find((tt: { teamId: string }) => tt.teamId === teamId)
      if (!teamInTournament) {
        return NextResponse.json({ error: 'Team is not in this tournament' }, { status: 400 })
      }

      // Remove team from tournament
      await (prisma as any).tournamentTeam.delete({
        where: {
          tournamentId_teamId: {
            tournamentId,
            teamId
          }
        }
      })

      // Reorder seeds for remaining teams
      const remainingTeams = await (prisma as any).tournamentTeam.findMany({
        where: { tournamentId },
        orderBy: { seed: 'asc' }
      })

      // Update seeds to be sequential
      for (let i = 0; i < remainingTeams.length; i++) {
        if (remainingTeams[i].seed !== i + 1) {
          await (prisma as any).tournamentTeam.update({
            where: { id: remainingTeams[i].id },
            data: { seed: i + 1 }
          })
        }
      }

      return NextResponse.json({ message: 'Team removed from tournament successfully' })
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "add" or "remove"' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error managing tournament teams:', error)
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
    const { seeds } = body // Array of { teamId, seed } objects

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
      return NextResponse.json({ error: 'Only league managers can update tournament seeding' }, { status: 403 })
    }

    // Update seeds for all teams
  const updatePromises = seeds.map((seedUpdate: { teamId: string; seed: number }) =>
      (prisma as any).tournamentTeam.update({
        where: {
          tournamentId_teamId: {
            tournamentId,
            teamId: seedUpdate.teamId
          }
        },
        data: { seed: seedUpdate.seed }
      })
    )

    await Promise.all(updatePromises)

    // Get updated tournament teams
    const updatedTeams = await (prisma as any).tournamentTeam.findMany({
      where: { tournamentId },
      include: {
        team: {
          select: { id: true, name: true }
        }
      },
      orderBy: { seed: 'asc' }
    })

    return NextResponse.json({ teams: updatedTeams })
  } catch (error) {
    console.error('Error updating tournament seeding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}