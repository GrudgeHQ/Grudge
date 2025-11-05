import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/leagues/[leagueId]/transfer - Transfer league management
export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Only current League Manager can transfer
  if (league.creatorId !== currentUser.id) {
    return NextResponse.json({ error: 'Only the current League Manager can transfer management' }, { status: 403 })
  }

  const body = await request.json()
  const { newManagerId } = body

  if (!newManagerId) {
    return NextResponse.json({ error: 'New manager ID is required' }, { status: 400 })
  }

  // Verify the new manager exists
  const newManager = await prisma.user.findUnique({
    where: { id: newManagerId }
  })

  if (!newManager) {
    return NextResponse.json({ error: 'New manager not found' }, { status: 404 })
  }

  // Check if the new manager is an admin of a team in this league
  const teamMembership = await prisma.teamMember.findFirst({
    where: {
      userId: newManagerId,
      isAdmin: true,
      team: {
        leagues: {
          some: {
            leagueId: leagueId
          }
        }
      }
    },
    include: {
      team: true
    }
  })

  if (!teamMembership) {
    return NextResponse.json({ 
      error: 'New manager must be an administrator of a team in this league' 
    }, { status: 400 })
  }

  // Transfer the league management
  const updatedLeague = await prisma.league.update({
    where: { id: leagueId },
    data: {
      creatorId: newManagerId
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return NextResponse.json({ 
    league: updatedLeague,
    message: `League management transferred to ${newManager.name || newManager.email}`
  })
}