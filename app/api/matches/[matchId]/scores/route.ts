import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId } = await params
  const body = await req.json()
  const { homeScore, awayScore, notes } = body

  if (homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: 'Both home and away scores are required' }, { status: 400 })
  }

  if (typeof homeScore !== 'number' || typeof awayScore !== 'number' || homeScore < 0 || awayScore < 0) {
    return NextResponse.json({ error: 'Scores must be non-negative numbers' }, { status: 400 })
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

    // First try to find a regular match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team: true,
        opponentTeam: true
      }
    })

    // If not found as regular match, try to find as season match
    let seasonMatch = null
    if (!match) {
      seasonMatch = await prisma.seasonMatch.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: true,
          awayTeam: true,
          season: {
            include: {
              league: true
            }
          }
        }
      })
      
      if (!seasonMatch) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 })
      }
    }

    // Handle regular matches (external matches)
    if (match && !seasonMatch) {
      // For external matches (no opponent team), allow direct score input
      if (!match.opponentTeamId) {
        // Verify user is an admin of the team
        const userTeamIds = user.memberships.filter(m => m.isAdmin).map(m => m.teamId)
        
        if (!userTeamIds.includes(match.teamId)) {
          return NextResponse.json({ error: 'Only team administrators can submit scores' }, { status: 403 })
        }

        // For external matches, directly update the match score (no confirmation needed)
        const updatedMatch = await prisma.match.update({
          where: { id: matchId },
          data: {
            homeScore,
            awayScore
          }
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Score updated successfully',
          match: {
            id: updatedMatch.id,
            homeScore: updatedMatch.homeScore,
            awayScore: updatedMatch.awayScore
          }
        })
      } else {
        return NextResponse.json({ error: 'Team vs team matches require league structure for score confirmation' }, { status: 400 })
      }
    }

    // Handle season matches (league matches)
    if (seasonMatch) {
      // Check if the match already has a confirmed score
      const confirmedSubmission = await prisma.seasonMatchScoreSubmission.findFirst({
        where: {
          seasonMatchId: matchId,
          status: 'CONFIRMED'
        }
      })

      if (confirmedSubmission) {
        return NextResponse.json({ 
          error: 'This match score has already been confirmed and cannot be modified' 
        }, { status: 400 })
      }

      // Verify user is an admin of one of the teams in the season match
      const userTeamIds = user.memberships.filter(m => m.isAdmin).map(m => m.teamId)
      const matchTeamIds = [seasonMatch.homeTeamId, seasonMatch.awayTeamId]
      
      const submittingTeamId = matchTeamIds.find(teamId => userTeamIds.includes(teamId))
      if (!submittingTeamId) {
        return NextResponse.json({ error: 'Only team administrators can submit scores' }, { status: 403 })
      }

      // Check if this team has already submitted a score for the season match
      const existingSubmission = await prisma.seasonMatchScoreSubmission.findUnique({
        where: {
          seasonMatchId_submittingTeamId: {
            seasonMatchId: matchId,
            submittingTeamId
          }
        }
      })

      let scoreSubmission
      let isUpdate = false

      if (existingSubmission) {
        // Only allow updates if the submission is still pending (not confirmed/disputed)
        if (existingSubmission.status !== 'PENDING') {
          return NextResponse.json({ 
            error: `Cannot update score submission. Current status: ${existingSubmission.status.toLowerCase()}` 
          }, { status: 400 })
        }

        // Update the existing submission
        scoreSubmission = await prisma.seasonMatchScoreSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            submittedById: user.id, // Update submitter in case different admin is editing
            homeScore,
            awayScore,
            notes: notes || null,
            submittedAt: new Date() // Update submission timestamp
          },
          include: {
            submittedBy: true,
            submittingTeam: true,
            seasonMatch: {
              include: {
                homeTeam: true,
                awayTeam: true
              }
            }
          }
        })
        isUpdate = true
      } else {
        // Create new score submission
        scoreSubmission = await prisma.seasonMatchScoreSubmission.create({
          data: {
            seasonMatchId: matchId,
            submittedById: user.id,
            submittingTeamId,
            homeScore,
            awayScore,
            notes: notes || null
          },
          include: {
            submittedBy: true,
            submittingTeam: true,
            seasonMatch: {
              include: {
                homeTeam: true,
                awayTeam: true
              }
            }
          }
        })
      }

      // Determine the opposing team
      const opposingTeamId = matchTeamIds.find(teamId => teamId !== submittingTeamId)
      
      if (opposingTeamId) {
        // Get all administrators of the opposing team
        const opposingTeamAdmins = await prisma.teamMember.findMany({
          where: {
            teamId: opposingTeamId,
            isAdmin: true
          },
          include: {
            user: true
          }
        })

        // Create notifications for opposing team administrators
        const notificationType = isUpdate ? 'season_match.score_updated' : 'season_match.score_submitted'
        await Promise.all(
          opposingTeamAdmins.map(admin =>
            prisma.notification.create({
              data: {
                userId: admin.userId,
                teamId: opposingTeamId,
                type: notificationType,
                payload: {
                  seasonMatchId: matchId,
                  leagueId: seasonMatch.season.leagueId,
                  scoreSubmissionId: scoreSubmission.id,
                  submittingTeam: scoreSubmission.submittingTeam.name,
                  homeScore,
                  awayScore,
                  submittedBy: scoreSubmission.submittedBy.name,
                  notes: notes || null,
                  isUpdate,
                  league: seasonMatch.season.league.name
                }
              }
            })
          )
        )
      }

      return NextResponse.json({ 
        success: true, 
        isUpdate,
        isSeasonMatch: true,
        scoreSubmission: {
          id: scoreSubmission.id,
          homeScore,
          awayScore,
          status: scoreSubmission.status,
          submittedBy: scoreSubmission.submittedBy.name,
          submittingTeam: scoreSubmission.submittingTeam.name,
          notes: scoreSubmission.notes,
          submittedAt: scoreSubmission.submittedAt
        }
      })
    }

    // If we reach here, something went wrong
    return NextResponse.json({ error: 'Unable to process score submission' }, { status: 500 })


  } catch (error) {
    console.error('Error submitting match score:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId } = await params

  try {
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email },
      include: {
        memberships: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the match and its score submissions
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team: true,
        opponentTeam: true,
        scoreSubmissions: {
          include: {
            submittedBy: true,
            submittingTeam: true,
            confirmedBy: true,
            confirmingTeam: true
          },
          orderBy: {
            submittedAt: 'desc'
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Check if user has access to this match (member of either team)
    const userTeamIds = user.memberships.map(m => m.teamId)
    const matchTeamIds = [match.teamId, match.opponentTeamId].filter((id): id is string => Boolean(id))
    
    const hasAccess = matchTeamIds.some(teamId => userTeamIds.includes(teamId))
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Determine user permissions
    const userMemberships = user.memberships.filter(m => matchTeamIds.includes(m.teamId))
    const isAdmin = userMemberships.some(m => m.isAdmin)
    
    // For external matches (no opponent team), only team admins can submit scores
    const isExternalMatch = !match.leagueMatchId && !match.opponentTeamId
    
    let canSubmit = false
    let canConfirm = false
    
    if (isExternalMatch) {
      // External matches: only admins can submit, no confirmation needed
      canSubmit = isAdmin && (match.homeScore === null || match.awayScore === null)
    } else {
      // League matches: existing logic for submissions and confirmations
      const latestSubmission = match.scoreSubmissions[0]
      const hasUnconfirmedSubmission = latestSubmission && latestSubmission.status === 'PENDING'
      
      if (!hasUnconfirmedSubmission) {
        canSubmit = isAdmin && (match.homeScore === null || match.awayScore === null)
      } else {
        // If there's an unconfirmed submission from our team, we can still "submit" (which will be an update)
        if (latestSubmission.submittingTeamId === userMemberships[0]?.teamId) {
          canSubmit = isAdmin
        }
      }
      
      if (hasUnconfirmedSubmission && latestSubmission.submittingTeamId !== userMemberships[0]?.teamId) {
        canConfirm = isAdmin
      }
    }

    // Determine if user can edit their own pending submission
    const userTeamId = userMemberships[0]?.teamId
    const userPendingSubmission = match.scoreSubmissions.find(sub => 
      sub.status === 'PENDING' && sub.submittingTeamId === userTeamId
    )
    const canEditSubmission = isAdmin && !!userPendingSubmission

    return NextResponse.json({ 
      match: {
        id: match.id,
        scheduledAt: match.scheduledAt,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        team: match.team,
        opponentTeam: match.opponentTeam,
        opponentName: match.opponentName,
        leagueMatchId: match.leagueMatchId
      },
      scoreSubmissions: match.scoreSubmissions.map(sub => ({
        id: sub.id,
        homeScore: sub.homeScore,
        awayScore: sub.awayScore,
        status: sub.status,
        submittedBy: sub.submittedBy.name,
        submittingTeam: sub.submittingTeam.name,
        confirmedBy: sub.confirmedBy?.name,
        confirmingTeam: sub.confirmingTeam?.name,
        notes: sub.notes,
        disputeReason: sub.disputeReason,
        submittedAt: sub.submittedAt,
        confirmedAt: sub.confirmedAt,
        canEdit: sub.status === 'PENDING' && sub.submittingTeamId === userTeamId && isAdmin
      })),
      canSubmit,
      canConfirm,
      canEditSubmission,
      isExternalMatch
    })
  } catch (error) {
    console.error('Error fetching match scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}