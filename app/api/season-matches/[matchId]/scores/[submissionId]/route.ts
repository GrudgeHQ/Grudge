import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateSeasonMatchScore } from '@/lib/standings'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string; submissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId, submissionId } = await params
    const { action, disputeReason } = await request.json()

    if (!action || !['confirm', 'dispute'].includes(action)) {
      return NextResponse.json({ error: 'Action must be either "confirm" or "dispute"' }, { status: 400 })
    }

    if (action === 'dispute' && !disputeReason) {
      return NextResponse.json({ error: 'Dispute reason is required when disputing a score' }, { status: 400 })
    }

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
    const scoreSubmission = await prisma.seasonMatchScoreSubmission.findUnique({
      where: { id: submissionId },
      include: {
        seasonMatch: {
          include: {
            homeTeam: true,
            awayTeam: true,
            season: {
              include: {
                league: {
                  include: {
                    creator: true
                  }
                }
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

    if (scoreSubmission.seasonMatchId !== matchId) {
      return NextResponse.json({ error: 'Score submission does not belong to this match' }, { status: 400 })
    }

    if (scoreSubmission.status !== 'PENDING') {
      return NextResponse.json({ error: 'This score submission has already been processed' }, { status: 400 })
    }

    // Verify user is an admin of the opposing team
  const userTeamIds = user.memberships.filter((m: any) => m.isAdmin).map((m: any) => m.teamId)
    const matchTeamIds = [
      scoreSubmission.seasonMatch.homeTeamId,
      scoreSubmission.seasonMatch.awayTeamId
    ]
    
    // The confirming team must be different from the submitting team
  const opposingTeamId = matchTeamIds.find((teamId: any) => 
      teamId !== scoreSubmission.submittingTeamId && userTeamIds.includes(teamId)
    )

    if (!opposingTeamId) {
      return NextResponse.json({ 
        error: 'Only administrators of the opposing team can confirm or dispute scores' 
      }, { status: 403 })
    }

    const confirmingTeam = await prisma.team.findUnique({
      where: { id: opposingTeamId },
      select: { id: true, name: true }
    })

    if (action === 'confirm') {
      // Update the score submission as confirmed
      const updatedSubmission = await prisma.seasonMatchScoreSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'CONFIRMED',
          confirmedById: user.id,
          confirmingTeamId: opposingTeamId,
          confirmedAt: new Date()
        },
        include: {
          seasonMatch: {
            include: {
              homeTeam: true,
              awayTeam: true,
              season: {
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

      // Update the actual match with the confirmed scores
      await updateSeasonMatchScore(
        matchId,
        scoreSubmission.homeScore,
        scoreSubmission.awayScore,
        'COMPLETED'
      )

      // Create notifications for the submitting team
      const submittingTeamAdmins = await prisma.teamMember.findMany({
        where: {
          teamId: scoreSubmission.submittingTeamId,
          isAdmin: true
        },
        include: {
          user: true
        }
      })

      // Notify submitting team admins that score was confirmed
      await Promise.all(
  submittingTeamAdmins.map((admin: any) =>
          prisma.notification.create({
            data: {
              userId: admin.userId,
              type: 'season_match.score_confirmed',
              payload: {
                matchId,
                leagueId: updatedSubmission.seasonMatch.season.leagueId,
                homeTeam: updatedSubmission.seasonMatch.homeTeam.name,
                awayTeam: updatedSubmission.seasonMatch.awayTeam.name,
                homeScore: scoreSubmission.homeScore,
                awayScore: scoreSubmission.awayScore,
                confirmedBy: user.name || user.email,
                confirmingTeam: confirmingTeam?.name,
                leagueName: updatedSubmission.seasonMatch.season.league.name,
                seasonName: updatedSubmission.seasonMatch.season.name
              }
            }
          })
        )
      )

      // Notify league manager about confirmed score
      const leagueCreatorIdConfirmed = updatedSubmission.seasonMatch.season.league.creatorId
      if (leagueCreatorIdConfirmed) {
        await prisma.notification.create({
          data: {
            userId: leagueCreatorIdConfirmed,
            type: 'league.match_score_confirmed',
            payload: {
              matchId,
              leagueId: updatedSubmission.seasonMatch.season.leagueId,
              homeTeam: updatedSubmission.seasonMatch.homeTeam.name,
              awayTeam: updatedSubmission.seasonMatch.awayTeam.name,
              homeScore: scoreSubmission.homeScore,
              awayScore: scoreSubmission.awayScore,
              submittingTeam: scoreSubmission.submittingTeam.name,
              confirmingTeam: confirmingTeam?.name,
              leagueName: updatedSubmission.seasonMatch.season.league.name,
              seasonName: updatedSubmission.seasonMatch.season.name
            }
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Score confirmed successfully! League standings have been updated.',
        submission: {
          id: updatedSubmission.id,
          status: 'CONFIRMED',
          confirmedBy: user.name || user.email,
          confirmingTeam: confirmingTeam?.name,
          confirmedAt: updatedSubmission.confirmedAt
        }
      })

    } else if (action === 'dispute') {
      // Update the score submission as disputed
      const updatedSubmission = await prisma.seasonMatchScoreSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'DISPUTED',
          confirmedById: user.id,
          confirmingTeamId: opposingTeamId,
          disputeReason,
          confirmedAt: new Date()
        },
        include: {
          seasonMatch: {
            include: {
              homeTeam: true,
              awayTeam: true,
              season: {
                include: {
                  league: {
                    include: {
                      creator: true
                    }
                  }
                }
              }
            }
          },
          submittedBy: true,
          submittingTeam: true
        }
      })

      // Create notifications for the submitting team
      const submittingTeamAdmins = await prisma.teamMember.findMany({
        where: {
          teamId: scoreSubmission.submittingTeamId,
          isAdmin: true
        },
        include: {
          user: true
        }
      })

      // Notify submitting team admins that score was disputed
      await Promise.all(
  submittingTeamAdmins.map((admin: any) =>
          prisma.notification.create({
            data: {
              userId: admin.userId,
              type: 'season_match.score_disputed',
              payload: {
                matchId,
                leagueId: updatedSubmission.seasonMatch.season.leagueId,
                homeTeam: updatedSubmission.seasonMatch.homeTeam.name,
                awayTeam: updatedSubmission.seasonMatch.awayTeam.name,
                homeScore: scoreSubmission.homeScore,
                awayScore: scoreSubmission.awayScore,
                disputedBy: user.name || user.email,
                disputingTeam: confirmingTeam?.name,
                disputeReason,
                leagueName: updatedSubmission.seasonMatch.season.league.name,
                seasonName: updatedSubmission.seasonMatch.season.name
              }
            }
          })
        )
      )

      // Notify league manager about the dispute
      const leagueCreatorIdDisputed = updatedSubmission.seasonMatch.season.league.creatorId
      if (leagueCreatorIdDisputed) {
        await prisma.notification.create({
          data: {
            userId: leagueCreatorIdDisputed,
            type: 'league.match_score_disputed',
            payload: {
              matchId,
              leagueId: updatedSubmission.seasonMatch.season.leagueId,
              homeTeam: updatedSubmission.seasonMatch.homeTeam.name,
              awayTeam: updatedSubmission.seasonMatch.awayTeam.name,
              homeScore: scoreSubmission.homeScore,
              awayScore: scoreSubmission.awayScore,
              submittingTeam: scoreSubmission.submittingTeam.name,
              disputingTeam: confirmingTeam?.name,
              disputedBy: user.name || user.email,
              disputeReason,
              leagueName: updatedSubmission.seasonMatch.season.league.name,
              seasonName: updatedSubmission.seasonMatch.season.name
            }
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Score disputed successfully. The league manager will review this dispute.',
        submission: {
          id: updatedSubmission.id,
          status: 'DISPUTED',
          disputedBy: user.name || user.email,
          disputingTeam: confirmingTeam?.name,
          disputeReason,
          disputedAt: updatedSubmission.confirmedAt
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error processing score confirmation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}