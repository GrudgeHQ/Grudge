import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId } = await params
    const { homeScore, awayScore, notes } = await request.json()

    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return NextResponse.json({ error: 'Invalid scores provided' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isAdmin: true },
          include: { team: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the season match
    const seasonMatch = await prisma.seasonMatch.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        season: {
          include: {
            league: {
              select: {
                id: true,
                name: true,
                creatorId: true
              }
            }
          }
        }
      }
    })

    if (!seasonMatch) {
      return NextResponse.json({ error: 'Season match not found' }, { status: 404 })
    }

    // Verify user is an admin of one of the teams
  const userAdminTeamIds = user.memberships.map((m: { teamId: string; isAdmin: boolean }) => m.teamId)
    const matchTeamIds = [seasonMatch.homeTeamId, seasonMatch.awayTeamId]
  const submittingTeamId = matchTeamIds.find((teamId: string) => userAdminTeamIds.includes(teamId))

    if (!submittingTeamId) {
      return NextResponse.json({ 
        error: 'Only team administrators can submit scores' 
      }, { status: 403 })
    }

    // Check if there's already a pending submission from this team
    const existingSubmission = await prisma.seasonMatchScoreSubmission.findFirst({
      where: {
        seasonMatchId: matchId,
        submittingTeamId,
        status: 'PENDING'
      }
    })

    if (existingSubmission) {
      return NextResponse.json({ 
        error: 'Your team has already submitted a score for this match. Please wait for confirmation.' 
      }, { status: 400 })
    }

    // Create the score submission
    const submission = await prisma.seasonMatchScoreSubmission.create({
      data: {
        seasonMatchId: matchId,
        homeScore,
        awayScore,
        submittedById: user.id,
        submittingTeamId,
        notes,
        status: 'PENDING'
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        submittingTeam: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Notify the opposing team administrators
  const opposingTeamId = matchTeamIds.find((teamId: any) => teamId !== submittingTeamId)
    if (opposingTeamId) {
      const opposingTeamAdmins = await prisma.teamMember.findMany({
        where: {
          teamId: opposingTeamId,
          isAdmin: true
        },
        include: { user: true }
      })

      await Promise.all(
  opposingTeamAdmins.map((admin: any) =>
          prisma.notification.create({
            data: {
              userId: admin.userId,
              type: 'season_match.score_submitted',
              payload: {
                matchId,
                leagueId: seasonMatch.season.leagueId,
                homeTeam: seasonMatch.homeTeam.name,
                awayTeam: seasonMatch.awayTeam.name,
                homeScore,
                awayScore,
                submittedBy: user.name || user.email,
                submittingTeam: submission.submittingTeam.name,
                leagueName: seasonMatch.season.league.name,
                seasonName: seasonMatch.season.name
              }
            }
          })
        )
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Score submitted successfully! Waiting for confirmation from the opposing team.',
      submission: {
        id: submission.id,
        homeScore: submission.homeScore,
        awayScore: submission.awayScore,
        status: submission.status,
        submittedBy: submission.submittedBy.name || submission.submittedBy.email,
        submittingTeam: submission.submittingTeam.name,
        submittedAt: submission.submittedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error submitting score:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId } = await params

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

    // Get the season match and verify access
    const seasonMatch = await prisma.seasonMatch.findUnique({
      where: { id: matchId },
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
                name: true,
                creatorId: true
              }
            }
          }
        }
      }
    })

    if (!seasonMatch) {
      return NextResponse.json({ error: 'Season match not found' }, { status: 404 })
    }

    // Check if user has access (team member or league manager)
  const userTeamIds = user.memberships.map((m: any) => m.teamId)
    const matchTeamIds = [seasonMatch.homeTeam.id, seasonMatch.awayTeam.id]
  const hasTeamAccess = userTeamIds.some((teamId: any) => matchTeamIds.includes(teamId))
    const isLeagueManager = seasonMatch.season.league.creatorId === user.id

    if (!hasTeamAccess && !isLeagueManager) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all score submissions for this match
    const submissions = await prisma.seasonMatchScoreSubmission.findMany({
      where: { seasonMatchId: matchId },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        submittingTeam: {
          select: {
            id: true,
            name: true
          }
        },
        confirmingTeam: {
          select: {
            id: true,
            name: true
          }
        },
        confirmedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    // Transform submissions for frontend
  const transformedSubmissions = submissions.map((submission: any) => ({
      id: submission.id,
      homeScore: submission.homeScore,
      awayScore: submission.awayScore,
      status: submission.status,
      submittedBy: submission.submittedBy.name || submission.submittedBy.email,
      submittingTeam: submission.submittingTeam.name,
      confirmingTeam: submission.confirmingTeam?.name,
      confirmedBy: submission.confirmedBy?.name || submission.confirmedBy?.email,
      notes: submission.notes,
      disputeReason: submission.disputeReason,
      submittedAt: submission.submittedAt.toISOString(),
      confirmedAt: submission.confirmedAt?.toISOString()
    }))

    return NextResponse.json({
      match: {
        id: seasonMatch.id,
        homeTeam: seasonMatch.homeTeam,
        awayTeam: seasonMatch.awayTeam,
        homeScore: seasonMatch.homeScore,
        awayScore: seasonMatch.awayScore,
        status: seasonMatch.status,
        scheduledAt: seasonMatch.scheduledAt?.toISOString() || null,
        location: seasonMatch.location,
        season: seasonMatch.season
      },
      submissions: transformedSubmissions,
      userAccess: {
        isLeagueManager,
        userTeamIds,
  isAdmin: user.memberships.some((m: any) => 
          matchTeamIds.includes(m.teamId) && m.isAdmin
        )
      }
    })

  } catch (error) {
    console.error('Error fetching score submissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}