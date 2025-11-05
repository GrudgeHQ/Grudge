import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/teams/[teamId]/join-requests/[requestId] - Approve or deny a team join request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; requestId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId, requestId } = await params
    const { action } = await request.json() // 'approve' or 'deny'

    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "deny"' }, { status: 400 })
    }

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if the user is a team administrator
    const teamMember = await prisma.teamMember.findUnique({
      where: { 
        userId_teamId: { userId: user.id, teamId }
      },
      select: { isAdmin: true }
    })

    if (!teamMember?.isAdmin) {
      return NextResponse.json({ error: 'Only team administrators can respond to join requests' }, { status: 403 })
    }

    // Find the join request
    const joinRequest = await prisma.teamJoinRequest.findUnique({
      where: { 
        id: requestId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            sport: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
    }

    // Ensure the request belongs to the correct team
    if (joinRequest.team.id !== teamId) {
      return NextResponse.json({ error: 'Request does not belong to this team' }, { status: 400 })
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Join request has already been processed' }, { status: 400 })
    }

    const status = action === 'approve' ? 'APPROVED' : 'DENIED'

    // Update the join request
    const updatedRequest = await prisma.teamJoinRequest.update({
      where: { id: requestId },
      data: {
        status,
        respondedById: user.id,
        respondedAt: new Date()
      }
    })

    // If approved, add the user to the team
    if (action === 'approve') {
      // Check if user is already a member (race condition protection)
      const existingMember = await prisma.teamMember.findUnique({
        where: { 
          userId_teamId: { userId: joinRequest.requestedBy.id, teamId }
        }
      })

      if (!existingMember) {
        await prisma.teamMember.create({
          data: {
            userId: joinRequest.requestedBy.id,
            teamId,
            role: 'MEMBER',
            isAdmin: false
          }
        })
      }
    }

    // Send notification to the requesting user
    const notificationTitle = action === 'approve' ? 'Team Join Approved' : 'Team Join Denied'
    const notificationMessage = action === 'approve'
      ? `Your request to join the team "${joinRequest.team.name}" has been approved! You are now a member.`
      : `Your request to join the team "${joinRequest.team.name}" has been denied.`

    await prisma.notification.create({
      data: {
        userId: joinRequest.requestedBy.id,
        type: `team_join_${action}`,
        payload: {
          title: notificationTitle,
          message: notificationMessage,
          teamId,
          teamName: joinRequest.team.name,
          teamSport: joinRequest.team.sport
        }
      }
    })

    return NextResponse.json({
      message: `Join request ${action}d successfully`,
      requestedUser: joinRequest.requestedBy.name || joinRequest.requestedBy.email,
      action
    })
  } catch (error) {
    console.error('Error processing team join request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}