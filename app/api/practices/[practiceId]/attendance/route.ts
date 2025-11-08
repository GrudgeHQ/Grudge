import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/practices/[practiceId]/attendance - Get attendance for a practice
export async function GET(
  request: Request,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  const { practiceId } = await params
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

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId }
  })

  if (!practice) {
    return NextResponse.json({ error: 'Practice not found' }, { status: 404 })
  }

  // Check if user is admin of this team
  const membership = user.memberships.find((tm: typeof user.memberships[number]) => tm.teamId === practice.teamId)
  const isAdmin = membership?.isAdmin || false

  const attendance = await prisma.practiceAttendance.findMany({
    where: { practiceId },
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
  })

  // Get current user's attendance
  const myAttendance = await prisma.practiceAttendance.findUnique({
    where: {
      practiceId_userId: {
        practiceId,
        userId: user.id
      }
    }
  })

  return NextResponse.json({
    attendance,
    myAttendance: myAttendance?.status || null,
    isAdmin
  })
}

// POST /api/practices/[practiceId]/attendance - Update user's attendance
export async function POST(
  request: Request,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  const { practiceId } = await params
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

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId }
  })

  if (!practice) {
    return NextResponse.json({ error: 'Practice not found' }, { status: 404 })
  }

  const body = await request.json()
  const { status } = body

  if (status !== 'GOING' && status !== 'NOT_GOING') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const attendance = await prisma.practiceAttendance.upsert({
    where: {
      practiceId_userId: {
        practiceId,
        userId: user.id
      }
    },
    create: {
      practiceId,
      userId: user.id,
      status
    },
    update: {
      status
    }
  })

  return NextResponse.json({ attendance })
}
