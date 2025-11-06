import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateBracket, TournamentTeam } from '@/lib/tournament/brackets'

export async function POST(req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
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

    // Get tournament with teams
    const tournament = await (prisma as any).tournament.findUnique({
      where: { id: tournamentId },
      include: {
        league: {
          select: { id: true, creatorId: true }
        },
        teams: {
          include: {
            team: {
              select: { id: true, name: true }
            }
          },
          orderBy: { seed: 'asc' }
        }
      }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Check if user is league manager
    const isLeagueManager = tournament.league.creatorId === user.id

    if (!isLeagueManager) {
      return NextResponse.json({ error: 'Only league managers can start tournaments' }, { status: 403 })
    }

    // Check if tournament is already started
    if (tournament.status !== 'CREATED') {
      return NextResponse.json({ error: 'Tournament has already been started' }, { status: 400 })
    }

    // Check if tournament has enough teams
    if (tournament.teams.length < 2) {
      return NextResponse.json({ error: 'Tournament needs at least 2 teams to start' }, { status: 400 })
    }

    // Generate bracket structure
  const teams: TournamentTeam[] = tournament.teams.map((tt: { id: string; teamId: string; seed: number; team: { id: string; name: string } }) => ({
      id: tt.id,
      teamId: tt.teamId,
      seed: tt.seed,
      team: tt.team
    }))

    const bracketStructure = generateBracket(tournament.format, teams, tournament.randomByes)

    // Start database transaction to create rounds and matches
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update tournament status
      const updatedTournament = await (tx as any).tournament.update({
        where: { id: tournamentId },
        data: { 
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      })

      // Create rounds and matches
  const createdRounds: any[] = []
      const allCreatedMatches: any[][] = [] // Track all matches by round for linking
      
      for (const roundData of bracketStructure.rounds) {
        // Create round
        const round = await (tx as any).tournamentRound.create({
          data: {
            tournamentId,
            roundNumber: roundData.roundNumber,
            name: roundData.name,
            bracket: roundData.bracket,
            isComplete: false
          }
        })

        // Create matches for this round
        const createdMatches = []
        for (const matchData of roundData.matches) {
          const match = await (tx as any).tournamentMatch.create({
            data: {
              tournamentId,
              roundId: round.id,
              matchNumber: matchData.matchNumber,
              bracket: matchData.bracket,
              homeTeamId: matchData.homeTeamId,
              awayTeamId: matchData.awayTeamId,
              status: matchData.status
            }
          })
          createdMatches.push(match)
        }

        allCreatedMatches.push(createdMatches)
        
        createdRounds.push({
          ...round,
          matches: createdMatches
        })
      }

      // Link matches with nextMatchId for winner advancement
      // Only link main bracket matches
      const mainBracketRounds = allCreatedMatches.filter((_, index) => 
        createdRounds[index].bracket === 'main'
      )
      
      for (let roundIndex = 0; roundIndex < mainBracketRounds.length - 1; roundIndex++) {
        const currentRoundMatches = mainBracketRounds[roundIndex]
        const nextRoundMatches = mainBracketRounds[roundIndex + 1]
        
        for (let matchIndex = 0; matchIndex < currentRoundMatches.length; matchIndex++) {
          const nextMatchIndex = Math.floor(matchIndex / 2)
          const nextMatch = nextRoundMatches[nextMatchIndex]
          
          if (nextMatch) {
            await (tx as any).tournamentMatch.update({
              where: { id: currentRoundMatches[matchIndex].id },
              data: { nextMatchId: nextMatch.id }
            })
          }
        }
      }

      return {
        tournament: updatedTournament,
        rounds: createdRounds
      }
    })

    return NextResponse.json({
      message: 'Tournament started successfully',
      tournament: result.tournament,
      bracket: {
        rounds: result.rounds,
        totalMatches: bracketStructure.totalMatches
      }
    })
  } catch (error) {
    console.error('Error starting tournament:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}