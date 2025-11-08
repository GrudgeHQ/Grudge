import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Create a match edit request
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params
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

    const { newScheduledAt, newLocation, changeReason } = await request.json()

    if (!changeReason?.trim()) {
      return NextResponse.json({ error: 'Change reason is required' }, { status: 400 })
    }

    // Get the match with team information
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: user.id },
              select: { role: true, isAdmin: true }
            }
          }
        },
        opponentTeam: {
          include: {
            members: {
              where: { userId: user.id },
              select: { role: true, isAdmin: true }
            }
          }
        },
        league: {
          include: {
            creator: true
          }
        }
      }
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Check if this is a future match
    if (match.scheduledAt <= new Date()) {
      return NextResponse.json({ error: 'Cannot edit past matches' }, { status: 400 })
    }

    // Check if user is a team admin of one of the teams in the match
  const isTeamAdmin = match.team.members.some((m: typeof match.team.members[number]) => m.isAdmin || m.role === 'ADMIN')
    const isOpponentTeamAdmin = match.opponentTeam && await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        teamId: match.opponentTeam.id,
        OR: [
          { isAdmin: true },
          { role: 'ADMIN' }
        ]
      }
    })

    if (!isTeamAdmin && !isOpponentTeamAdmin) {
      return NextResponse.json({ error: 'Only team administrators can request match edits' }, { status: 403 })
    }

    // Determine which team is making the request
    const requestingTeamId = isTeamAdmin ? match.teamId : match.opponentTeamId!

    // Check if there's already a pending edit request for this match from this team
    const existingRequest = await prisma.matchEditRequest.findFirst({
      where: {
        matchId,
        requestingTeamId,
        status: 'PENDING'
      }
    })

    if (existingRequest) {
      return NextResponse.json({ error: 'There is already a pending edit request for this match' }, { status: 400 })
    }

    // Validate that at least one change is requested
    if (!newScheduledAt && !newLocation) {
      return NextResponse.json({ error: 'At least one change (date/time or location) must be specified' }, { status: 400 })
    }

    // Validate new scheduled date is in the future
    if (newScheduledAt && new Date(newScheduledAt) <= new Date()) {
      return NextResponse.json({ error: 'New scheduled date must be in the future' }, { status: 400 })
    }

    // Create the edit request
    const editRequest = await prisma.matchEditRequest.create({
      data: {
        matchId,
        requestedById: session.user.id,
        requestingTeamId,
        currentScheduledAt: match.scheduledAt,
        currentLocation: match.location,
        newScheduledAt: newScheduledAt ? new Date(newScheduledAt) : null,
        newLocation: newLocation || null,
        changeReason,
        status: 'PENDING'
      },
      include: {
        match: {
          include: {
            team: true,
            opponentTeam: true,
            league: {
              include: {
                creator: true
              }
            }
          }
        },
        requestedBy: true,
        requestingTeam: true
      }
    })

    // Create notification for league manager
    if (match.league?.creator) {
      await prisma.notification.create({
        data: {
          userId: match.league.creator.id,
          type: 'MATCH_EDIT_REQUEST',
          payload: {
            editRequestId: editRequest.id,
            matchId: match.id,
            requestingTeam: editRequest.requestingTeam.name,
            homeTeam: match.team.name,
            awayTeam: match.opponentTeam?.name || 'TBD',
            changeReason: changeReason,
            requestedBy: editRequest.requestedBy.name
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      editRequest: {
        id: editRequest.id,
        matchId: editRequest.matchId,
        requestedBy: editRequest.requestedBy.name,
        requestingTeam: editRequest.requestingTeam.name,
        currentScheduledAt: editRequest.currentScheduledAt,
        currentLocation: editRequest.currentLocation,
        newScheduledAt: editRequest.newScheduledAt,
        newLocation: editRequest.newLocation,
        changeReason: editRequest.changeReason,
        status: editRequest.status,
        createdAt: editRequest.createdAt
      }
    })

  } catch (error) {
    console.error('Error creating match edit request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get match edit requests for a specific match
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the match to verify access
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        },
        opponentTeam: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        },
        league: true
      }
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Check if user has access to this match (team member or league manager)
    const isTeamMember = match.team.members.length > 0
    const isOpponentMember = (match.opponentTeam?.members?.length ?? 0) > 0
    const isLeagueManager = match.league?.creatorId === session.user.id

    if (!isTeamMember && !isOpponentMember && !isLeagueManager) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get edit requests for this match
    const editRequests = await prisma.matchEditRequest.findMany({
      where: { matchId },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true }
        },
        requestingTeam: {
          select: { id: true, name: true }
        },
        reviewedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      editRequests: editRequests.map((req: typeof editRequests[number]) => ({
        id: req.id,
        matchId: req.matchId,
        requestedBy: req.requestedBy,
        requestingTeam: req.requestingTeam,
        currentScheduledAt: req.currentScheduledAt,
        currentLocation: req.currentLocation,
        newScheduledAt: req.newScheduledAt,
        newLocation: req.newLocation,
        changeReason: req.changeReason,
        status: req.status,
        reviewedBy: req.reviewedBy,
        reviewReason: req.reviewReason,
        createdAt: req.createdAt,
        reviewedAt: req.reviewedAt
      }) )
    });

  } catch (error) {
    console.error('Error fetching match edit requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}