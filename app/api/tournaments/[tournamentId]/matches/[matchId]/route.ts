import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(req: Request, { params }: { params: Promise<{ tournamentId: string, matchId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId, matchId } = await params
    const body = await req.json()
    const { homeScore, awayScore, notes } = body

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tournament match with tournament info
    const match = await (prisma as any).tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            league: {
              select: { id: true, creatorId: true }
            }
          }
        },
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
      }
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.tournamentId !== tournamentId) {
      return NextResponse.json({ error: 'Match does not belong to this tournament' }, { status: 400 })
    }

    // Check if user is league manager
    const isLeagueManager = match.tournament.league.creatorId === user.id

    if (!isLeagueManager) {
      return NextResponse.json({ error: 'Only league managers can submit match results' }, { status: 403 })
    }

    // Validate scores
    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return NextResponse.json({ error: 'Invalid scores provided' }, { status: 400 })
    }

    if (homeScore < 0 || awayScore < 0) {
      return NextResponse.json({ error: 'Scores cannot be negative' }, { status: 400 })
    }

    if (homeScore === awayScore) {
      return NextResponse.json({ error: 'Tournament matches cannot end in a tie' }, { status: 400 })
    }

    // Determine winner
    const winnerId = homeScore > awayScore ? match.homeTeamId : match.awayTeamId
    const winnerTeam = homeScore > awayScore ? match.homeTeam : match.awayTeam

    // Update match with results in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update match
      const updatedMatch = await (tx as any).tournamentMatch.update({
        where: { id: matchId },
        data: {
          homeScore,
          awayScore,
          winnerId,
          status: 'COMPLETED',
          playedAt: new Date(),
          notes: notes || null
        },
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
        }
      })

      // Check if this completes the round
      const round = await (tx as any).tournamentRound.findUnique({
        where: { id: match.roundId },
        include: {
          matches: {
            select: { id: true, status: true }
          }
        }
      })

      const allMatchesComplete = round.matches.every((m: any) => 
        m.id === matchId ? true : m.status === 'COMPLETED'
      )

      let updatedRound = round
      if (allMatchesComplete) {
        updatedRound = await (tx as any).tournamentRound.update({
          where: { id: match.roundId },
          data: { isComplete: true }
        })
      }

      // Advance winner to next round if it exists
      if (match.nextMatchId) {
        const nextMatch = await (tx as any).tournamentMatch.findUnique({
          where: { id: match.nextMatchId }
        })

        if (nextMatch) {
          // Find all matches in the same round that feed into the next match
          const currentRoundMatches = await (tx as any).tournamentMatch.findMany({
            where: {
              roundId: match.roundId,
              nextMatchId: match.nextMatchId
            },
            orderBy: { matchNumber: 'asc' }
          })

          // Determine position: if this is the first match feeding into next match, it goes to home slot
          // Otherwise it goes to away slot
          const isFirstFeeder = currentRoundMatches[0]?.id === matchId
          
          const updateData: any = {}
          if (isFirstFeeder) {
            updateData.homeTeamId = winnerId
          } else {
            updateData.awayTeamId = winnerId
          }

          await (tx as any).tournamentMatch.update({
            where: { id: match.nextMatchId },
            data: updateData
          })
        }
      }

      // Check if tournament is complete
      const tournament = await (tx as any).tournament.findUnique({
        where: { id: tournamentId },
        include: {
          rounds: {
            include: {
              matches: {
                select: { id: true, status: true, winnerId: true, bracket: true }
              }
            }
          }
        }
      })

      // Check if this was the final match
      const finalRound = tournament.rounds
        .filter((r: any) => r.bracket === 'main')
        .sort((a: any, b: any) => b.roundNumber - a.roundNumber)[0]

      const isFinalMatch = finalRound && finalRound.matches.length === 1 && 
                          finalRound.matches[0].id === matchId

      let updatedTournament = tournament
      if (isFinalMatch) {
        // Tournament is complete
        updatedTournament = await (tx as any).tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            winnerId: winnerId
          }
        })

        // Update winner team's final placement
        await (tx as any).tournamentTeam.update({
          where: { id: winnerId },
          data: { finalPlacement: 1 }
        })

        // Update runner-up
        const runnerUpId = homeScore > awayScore ? match.awayTeamId : match.homeTeamId
        if (runnerUpId) {
          await (tx as any).tournamentTeam.update({
            where: { id: runnerUpId },
            data: { finalPlacement: 2 }
          })

          // Also update tournament runner-up
          await (tx as any).tournament.update({
            where: { id: tournamentId },
            data: { runnerUpId }
          })
        }
      }

      return {
        match: updatedMatch,
        round: updatedRound,
        tournament: updatedTournament,
        isComplete: isFinalMatch
      }
    })

    // Determine winner team info for response
    let winnerInfo = null
    if (result.isComplete) {
      const winningTeam = homeScore > awayScore ? result.match.homeTeam : result.match.awayTeam
      winnerInfo = {
        team: {
          id: winningTeam?.team?.id,
          name: winningTeam?.team?.name
        }
      }
    }

    return NextResponse.json({
      message: 'Match result submitted successfully',
      match: result.match,
      isRoundComplete: result.round.isComplete,
      isTournamentComplete: result.isComplete,
      winner: winnerInfo
    })
  } catch (error) {
    console.error('Error submitting match result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}