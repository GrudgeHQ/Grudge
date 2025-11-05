import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/scrimmages - Get all scrimmages for user's teams
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: true
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const teamIds = user.memberships.map((tm) => tm.teamId)

  const scrimmages = await prisma.scrimmage.findMany({
    where: {
      teamId: { in: teamIds }
    },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      },
      createdBy: {
        select: {
          id: true,
          name: true
        }
      },
      participants: true,
      scrimmageRounds: {
        orderBy: {
          roundNumber: 'asc'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return NextResponse.json({ scrimmages })
}

// POST /api/scrimmages - Create a new scrimmage
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: true
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const { teamId, name, rounds, playersPerTeam, timedRounds, roundDuration, participants, linkedGroups } = body

  if (!teamId || !rounds || !playersPerTeam || !participants || participants.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify user is member of this team
  const membership = user.memberships.find((tm) => tm.teamId === teamId)
  if (!membership) {
    return NextResponse.json({ error: 'You must be a member to create scrimmages' }, { status: 403 })
  }

  const scrimmage = await prisma.scrimmage.create({
    data: {
      teamId,
      name: name || null,
      rounds,
      playersPerTeam,
      timedRounds: timedRounds || false,
      roundDuration: roundDuration || null,
      createdById: user.id,
      settings: linkedGroups && linkedGroups.length > 0 ? { linkedGroups } : undefined,
      participants: {
        create: participants.map((p: any) => ({
          userId: p.userId,
          userName: p.userName
        }))
      }
    },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      },
      participants: true
    }
  })

  return NextResponse.json({ scrimmage }, { status: 201 })
}
