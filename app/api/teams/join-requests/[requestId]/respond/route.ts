import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/teams/join-requests/[requestId]/respond
export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params
  const session = (await getServerSession(authOptions as any)) as any
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body // 'approve' or 'deny'
    
    if (!action || !['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "deny"' }, { status: 400 })
    }

    // Find the user making the request
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the join request
    const joinRequest = await prisma.teamJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        team: true,
        requestedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Join request has already been processed' }, { status: 400 })
    }

    // Check if the user is an admin of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: joinRequest.teamId
        }
      }
    })

    if (!membership || !membership.isAdmin) {
      return NextResponse.json({ error: 'Only team administrators can respond to join requests' }, { status: 403 })
    }

    // Update the join request status
    const updatedRequest = await prisma.teamJoinRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'DENIED',
        respondedAt: new Date(),
        respondedById: user.id
      },
      include: {
        team: true,
        requestedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // If approved, add the user to the team
    if (action === 'approve') {
      await prisma.teamMember.create({
        data: {
          userId: joinRequest.requestedById,
          teamId: joinRequest.teamId,
          role: 'MEMBER',
          isAdmin: false
        }
      })

      // Create audit log for team join
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          teamId: joinRequest.teamId,
          action: 'TEAM_MEMBER_ADDED',
          targetId: joinRequest.requestedById,
          payload: {
            addedUserId: joinRequest.requestedById,
            addedUserName: joinRequest.requestedBy.name || joinRequest.requestedBy.email,
            addedByUserId: user.id,
            addedByUserName: user.name || user.email,
            role: 'MEMBER',
            isAdmin: false,
            method: 'join_request_approval'
          }
        }
      })
    }

    // Notify the requester about the decision
    await prisma.notification.create({
      data: {
        userId: joinRequest.requestedById,
        type: 'team_join_response',
        payload: {
          title: action === 'approve' ? 'Welcome to the Team!' : 'Team Join Request Denied',
          message: action === 'approve' 
            ? `Your request to join "${joinRequest.team.name}" has been approved!`
            : `Your request to join "${joinRequest.team.name}" has been denied.`,
          teamId: joinRequest.teamId,
          teamName: joinRequest.team.name,
          action: action,
          respondedBy: user.name || user.email
        }
      }
    })

    // Mark the original join request notification as read for all admins
    await prisma.notification.updateMany({
      where: {
        type: 'team_join_request',
        payload: {
          path: ['requestId'],
          equals: requestId
        }
      },
      data: {
        read: true
      }
    })

    return NextResponse.json({
      ok: true,
      message: `Join request ${action}d successfully`,
      request: updatedRequest,
      teamMemberCreated: action === 'approve'
    })

  } catch (error) {
    console.error('Error responding to join request:', error)
    return NextResponse.json({ error: 'Failed to process join request' }, { status: 500 })
  }
}