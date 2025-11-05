import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/leagues/[leagueId]/join-requests - Get pending join requests for a league
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await params

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
      return NextResponse.json({ error: 'Only the League Manager can view join requests' }, { status: 403 })
    }

    // Get all pending join requests for this league
    const joinRequests = await prisma.leagueJoinRequest.findMany({
      where: { leagueId, status: 'PENDING' },
      include: {
        team: {
          select: { 
            id: true, 
            name: true, 
            sport: true,
            _count: {
              select: { members: true }
            }
          }
        },
        requestedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    }) as any[]

    // Transform the data to match the expected interface
    const transformedRequests = joinRequests.map((request: any) => ({
      id: request.id,
      status: request.status,
      createdAt: request.requestedAt.toISOString(),
      team: {
        id: request.team.id,
        name: request.team.name,
        sport: request.team.sport,
        memberCount: request.team._count.members
      },
      requestedBy: {
        id: request.requestedBy.id,
        name: request.requestedBy.name,
        email: request.requestedBy.email
      }
    }))

    return NextResponse.json(transformedRequests)
  } catch (error) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}