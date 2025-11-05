import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/teams/[teamId]/join-requests - Get pending join requests for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await params

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
      return NextResponse.json({ error: 'Only team administrators can view join requests' }, { status: 403 })
    }

    // Get pending join requests with user information
    const joinRequests = await prisma.teamJoinRequest.findMany({
      where: {
        teamId,
        status: 'PENDING'
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            bio: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    })

    return NextResponse.json(joinRequests)
  } catch (error) {
    console.error('Error fetching team join requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}