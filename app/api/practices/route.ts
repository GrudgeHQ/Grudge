import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/practices - Get all practices for user's teams
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { email?: string } }
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const teamIds = user.memberships.map((tm: { teamId: string }) => tm.teamId)

  // Get practices with a cutoff for "recent" - only load attendance for practices within last 30 days + future
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const practices = await prisma.practice.findMany({
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
      attendance: {
        where: {
          // Only include attendance for recent/upcoming practices
          practice: {
            scheduledAt: {
              gte: thirtyDaysAgo
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          user: {
            name: 'asc'
          }
        }
      }
    },
    orderBy: {
      scheduledAt: 'desc'
    }
  })

  // Add user's attendance status to each practice
  const practicesWithMyAttendance = practices.map((practice: { attendance: Array<{ userId: string; status?: string }> }) => {
    const myAttendance = practice.attendance.find((a: { userId: string; status?: string }) => a.userId === user.id)
    return {
      ...practice,
      myAttendance: myAttendance?.status || null
    }
  })

  return NextResponse.json({ practices: practicesWithMyAttendance })
}

// POST /api/practices - Create a new practice
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { email?: string } }
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
  const { teamId, scheduledAt, location } = body

  if (!teamId || !scheduledAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify user is admin of this team
  const membership = user.memberships.find((tm: { teamId: string }) => tm.teamId === teamId)
  if (!membership || !membership.isAdmin) {
    return NextResponse.json({ error: 'You must be an admin to create practices' }, { status: 403 })
  }

  const practice = await prisma.practice.create({
    data: {
      teamId,
      scheduledAt: new Date(scheduledAt),
      location: location || null
    },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  return NextResponse.json({ practice }, { status: 201 })
}
