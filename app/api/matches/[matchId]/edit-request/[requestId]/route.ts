import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/matches/[matchId]/edit-request/[requestId] - Approve or deny a match edit request
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string; requestId: string }> }
) {
  const { matchId, requestId } = await params
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

  try {
    const { action, reason } = await request.json()

    if (!action || !['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'Action must be either "approve" or "deny"' }, { status: 400 })
    }

    if (action === 'deny' && !reason?.trim()) {
      return NextResponse.json({ error: 'Reason is required when denying a request' }, { status: 400 })
    }

    // Get the edit request with match and league information
    const editRequest = await prisma.matchEditRequest.findUnique({
      where: { id: requestId },
      include: {
        match: true,
        requestedBy: true,
        requestingTeam: true
      }
    })

    if (!editRequest) {
      return NextResponse.json({ error: 'Edit request not found' }, { status: 404 })
    }

    if (editRequest.matchId !== matchId) {
      return NextResponse.json({ error: 'Edit request does not belong to this match' }, { status: 400 })
    }

    if (editRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Edit request has already been processed' }, { status: 400 })
    }

    // Check if user is the league manager
    let isLeagueManager = false
    if (editRequest.match.leagueId) {
      const league = await prisma.league.findUnique({
        where: { id: editRequest.match.leagueId }
      })
      isLeagueManager = league?.creatorId === user.id
    }

    if (!isLeagueManager) {
      return NextResponse.json({ error: 'Only league managers can approve or deny edit requests' }, { status: 403 })
    }

    // Begin transaction to update the edit request and potentially the match
  const result = await prisma.$transaction(async (tx) => {
      // Update the edit request
      const updatedRequest = await tx.matchEditRequest.update({
        where: { id: requestId },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'DENIED',
          reviewedById: user.id,
          reviewReason: reason || null,
          reviewedAt: new Date()
        }
      })

      // If approved, update the match
      if (action === 'approve') {
        const updateData: any = {}
        
        if (editRequest.newScheduledAt) {
          updateData.scheduledAt = editRequest.newScheduledAt
        }
        
        if (editRequest.newLocation !== undefined) {
          updateData.location = editRequest.newLocation
        }

        if (Object.keys(updateData).length > 0) {
          await tx.match.update({
            where: { id: matchId },
            data: updateData
          })
        }
      }

      return updatedRequest
    })

    // Get team information for notifications
    const homeTeam = await prisma.team.findUnique({
      where: { id: editRequest.match.teamId },
      include: {
        members: {
          where: {
            OR: [
              { isAdmin: true },
              { role: 'ADMIN' }
            ]
          },
          include: { user: true }
        }
      }
    })

    const awayTeam = editRequest.match.opponentTeamId ? await prisma.team.findUnique({
      where: { id: editRequest.match.opponentTeamId },
      include: {
        members: {
          where: {
            OR: [
              { isAdmin: true },
              { role: 'ADMIN' }
            ]
          },
          include: { user: true }
        }
      }
    }) : null

    // Create notifications for team administrators
    const notificationData = {
      type: action === 'approve' ? 'MATCH_EDIT_APPROVED' : 'MATCH_EDIT_DENIED',
      payload: {
        editRequestId: requestId,
        matchId: matchId,
        homeTeam: homeTeam?.name,
        awayTeam: awayTeam?.name || editRequest.match.opponentName || 'TBD',
        reviewedBy: user.name,
        reviewReason: reason || null,
        newScheduledAt: editRequest.newScheduledAt,
        newLocation: editRequest.newLocation,
        originalScheduledAt: editRequest.currentScheduledAt,
        originalLocation: editRequest.currentLocation
      }
    }

    // Notify home team admins
    if (homeTeam) {
      for (const member of homeTeam.members) {
        await prisma.notification.create({
          data: {
            userId: member.user.id,
            ...notificationData
          }
        })
      }
    }

    // Notify away team admins
    if (awayTeam) {
      for (const member of awayTeam.members) {
        await prisma.notification.create({
          data: {
            userId: member.user.id,
            ...notificationData
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      editRequest: {
        id: result.id,
        matchId: result.matchId,
        status: result.status,
        reviewedBy: user.name,
        reviewReason: result.reviewReason,
        reviewedAt: result.reviewedAt
      },
      message: action === 'approve' 
        ? 'Match edit request approved and changes applied'
        : 'Match edit request denied'
    })

  } catch (error) {
    console.error('Error processing match edit request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/matches/[matchId]/edit-request/[requestId] - Cancel an edit request
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ matchId: string; requestId: string }> }
) {
  const { matchId, requestId } = await params
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

  try {
    // Get the edit request
    const editRequest = await prisma.matchEditRequest.findUnique({
      where: { id: requestId }
    })

    if (!editRequest) {
      return NextResponse.json({ error: 'Edit request not found' }, { status: 404 })
    }

    if (editRequest.matchId !== matchId) {
      return NextResponse.json({ error: 'Edit request does not belong to this match' }, { status: 400 })
    }

    if (editRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Can only cancel pending edit requests' }, { status: 400 })
    }

    if (editRequest.requestedById !== user.id) {
      return NextResponse.json({ error: 'Only the requesting user can cancel the edit request' }, { status: 403 })
    }

    // Cancel the edit request
    await prisma.matchEditRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Edit request cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling match edit request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}