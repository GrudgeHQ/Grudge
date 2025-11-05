import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/leagues/[leagueId]/join-requests/[requestId] - Approve or deny a join request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string; requestId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId, requestId } = await params
    const { action } = await request.json() // 'approve' or 'deny'

    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "deny"' }, { status: 400 })
    }

    // Get the current user to verify League Manager status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if the user is the League Manager
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { creatorId: true, name: true }
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the League Manager can respond to join requests' }, { status: 403 })
    }

    // Find the join request with team and requester info
    const joinRequest = await prisma.leagueJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        team: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } }
      }
    })
    
    // Validate request exists, belongs to this league, and is pending
    if (!joinRequest || joinRequest.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 })
    }
    
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Join request has already been processed' }, { status: 400 })
    }
    
    // Update join request status
    const status = action === 'approve' ? 'APPROVED' : 'DENIED'
    await prisma.leagueJoinRequest.update({
      where: { id: requestId },
      data: { 
        status, 
        respondedById: user.id, 
        respondedAt: new Date() 
      }
    })
    
    // If approved, add team to league
    if (action === 'approve') {
      // Check if team is already in league (safety check)
      const existingTeam = await prisma.leagueTeam.findUnique({
        where: {
          leagueId_teamId: {
            leagueId,
            teamId: joinRequest.team.id
          }
        }
      })
      
      if (!existingTeam) {
        await prisma.leagueTeam.create({
          data: { leagueId, teamId: joinRequest.team.id }
        })
      }
    }
    
    // Send notification to team administrator
    const notificationTitle = action === 'approve' ? 'League Join Approved' : 'League Join Denied'
    const notificationMessage = action === 'approve'
      ? `Your team "${joinRequest.team.name}" has been accepted into the league "${league.name}"`
      : `Your request to join the league "${league.name}" has been denied`
    
    await prisma.notification.create({
      data: {
        userId: joinRequest.requestedById,
        type: `league_join_${action}` as any,
        payload: {
          title: notificationTitle,
          message: notificationMessage,
          leagueId,
          leagueName: league.name,
          teamId: joinRequest.team.id,
          teamName: joinRequest.team.name
        }
      }
    })
    
    // Return success response
    return NextResponse.json({
      message: `Join request ${action}d successfully`,
      teamName: joinRequest.team.name,
      action
    })
  } catch (error) {
    console.error('Error processing join request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}