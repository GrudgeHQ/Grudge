import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string; submissionId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId, submissionId } = await params
  const body = await req.json()
  const { action, disputeReason } = body // action: 'confirm' or 'dispute'

  if (!action || !['confirm', 'dispute'].includes(action)) {
    return NextResponse.json({ error: 'Action must be either "confirm" or "dispute"' }, { status: 400 })
  }

  if (action === 'dispute' && !disputeReason) {
    return NextResponse.json({ error: 'Dispute reason is required when disputing a score' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            team: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the score submission
    const scoreSubmission = await prisma.matchScoreSubmission.findUnique({
      where: { id: submissionId },
      include: {
        match: {
          include: {
            team: true,
            opponentTeam: true,
            leagueMatch: {
              include: {
                league: true
              }
            }
          }
        },
        submittedBy: true,
        submittingTeam: true
      }
    })

    if (!scoreSubmission) {
      return NextResponse.json({ error: 'Score submission not found' }, { status: 404 })
    }

    if (scoreSubmission.matchId !== matchId) {
      return NextResponse.json({ error: 'Score submission does not belong to this match' }, { status: 400 })
    }

    if (scoreSubmission.status !== 'PENDING') {
      return NextResponse.json({ error: 'This score submission has already been processed' }, { status: 400 })
    }

    // Verify user is an admin of the opposing team
    const userTeamIds = user.memberships.filter(m => m.isAdmin).map(m => m.teamId)
    const match = scoreSubmission.match
    const matchTeamIds = [match.teamId, match.opponentTeamId].filter((id): id is string => Boolean(id))
    
    // The confirming team must be different from the submitting team
    const confirmingTeamId = matchTeamIds.find(teamId => 
      teamId !== scoreSubmission.submittingTeamId && userTeamIds.includes(teamId)
    )

    if (!confirmingTeamId) {
      return NextResponse.json({ error: 'Only administrators from the opposing team can confirm scores' }, { status: 403 })
    }

    const now = new Date()
    let updatedSubmission

    if (action === 'confirm') {
      // Confirm the score and update the match
      updatedSubmission = await prisma.$transaction(async (tx) => {
        // Update the score submission
        const updated = await tx.matchScoreSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'CONFIRMED',
            confirmedById: user.id,
            confirmingTeamId,
            confirmedAt: now
          },
          include: {
            submittedBy: true,
            submittingTeam: true,
            confirmedBy: true,
            confirmingTeam: true,
            match: true
          }
        })

        // Update the match with the confirmed scores
        await tx.match.update({
          where: { id: matchId },
          data: {
            homeScore: scoreSubmission.homeScore,
            awayScore: scoreSubmission.awayScore
          }
        })

        return updated
      })

      // Delete old pending review notifications for this score submission
      // Get all notifications of these types and filter by payload in code
      const notificationsToDelete = await prisma.notification.findMany({
        where: {
          type: {
            in: ['season_match.score_submitted', 'season_match.score_updated']
          }
        }
      })
      
      const idsToDelete = notificationsToDelete
        .filter(n => {
          const payload = n.payload as any
          return payload?.scoreSubmissionId === submissionId
        })
        .map(n => n.id)
      
      if (idsToDelete.length > 0) {
        await prisma.notification.deleteMany({
          where: {
            id: {
              in: idsToDelete
            }
          }
        })
      }

      // Create notification for the original submitter
      await prisma.notification.create({
        data: {
          userId: scoreSubmission.submittedById,
          teamId: scoreSubmission.submittingTeamId,
          type: 'match.score_confirmed',
          payload: {
            matchId,
            scoreSubmissionId: submissionId,
            confirmingTeam: updatedSubmission.confirmingTeam?.name,
            confirmedBy: user.name,
            homeScore: scoreSubmission.homeScore,
            awayScore: scoreSubmission.awayScore
          }
        }
      })
    } else {
      // Dispute the score
      updatedSubmission = await prisma.matchScoreSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'DISPUTED',
          confirmedById: user.id,
          confirmingTeamId,
          confirmedAt: now,
          disputeReason
        },
        include: {
          submittedBy: true,
          submittingTeam: true,
          confirmedBy: true,
          confirmingTeam: true,
          match: true
        }
      })

      // Delete old pending review notifications for this score submission
      // Get all notifications of these types and filter by payload in code
      const notificationsToDeleteDispute = await prisma.notification.findMany({
        where: {
          type: {
            in: ['season_match.score_submitted', 'season_match.score_updated']
          }
        }
      })
      
      const idsToDeleteDispute = notificationsToDeleteDispute
        .filter(n => {
          const payload = n.payload as any
          return payload?.scoreSubmissionId === submissionId
        })
        .map(n => n.id)
      
      if (idsToDeleteDispute.length > 0) {
        await prisma.notification.deleteMany({
          where: {
            id: {
              in: idsToDeleteDispute
            }
          }
        })
      }

      // Create notification for the original submitter
      await prisma.notification.create({
        data: {
          userId: scoreSubmission.submittedById,
          teamId: scoreSubmission.submittingTeamId,
          type: 'match.score_disputed',
          payload: {
            matchId,
            scoreSubmissionId: submissionId,
            confirmingTeam: updatedSubmission.confirmingTeam?.name,
            disputedBy: user.name,
            homeScore: scoreSubmission.homeScore,
            awayScore: scoreSubmission.awayScore,
            disputeReason
          }
        }
      })

      // Also notify league administrators if available
      if (match.leagueMatch) {
        const league = match.leagueMatch.league
        if (league.creatorId) {
          await prisma.notification.create({
            data: {
              userId: league.creatorId,
              type: 'league.score_disputed',
              payload: {
                matchId,
                scoreSubmissionId: submissionId,
                leagueName: league.name,
                submittingTeam: scoreSubmission.submittingTeam.name,
                confirmingTeam: updatedSubmission.confirmingTeam?.name,
                disputedBy: user.name,
                homeScore: scoreSubmission.homeScore,
                awayScore: scoreSubmission.awayScore,
                disputeReason
              }
            }
          })
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      scoreSubmission: {
        id: updatedSubmission.id,
        status: updatedSubmission.status,
        homeScore: updatedSubmission.homeScore,
        awayScore: updatedSubmission.awayScore,
        submittedBy: updatedSubmission.submittedBy.name,
        submittingTeam: updatedSubmission.submittingTeam.name,
        confirmedBy: updatedSubmission.confirmedBy?.name,
        confirmingTeam: updatedSubmission.confirmingTeam?.name,
        disputeReason: updatedSubmission.disputeReason,
        submittedAt: updatedSubmission.submittedAt,
        confirmedAt: updatedSubmission.confirmedAt
      }
    })
  } catch (error) {
    console.error('Error processing score confirmation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}