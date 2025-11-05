import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/practices/[practiceId] - Get a single practice
export async function GET(
  request: Request,
  { params }: { params: Promise<{ practiceId: string }> }
) {
  const { practiceId } = await params
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  if (!practice) {
    return NextResponse.json({ error: 'Practice not found' }, { status: 404 })
  }

  return NextResponse.json({ practice })
}

// PATCH /api/practices/[practiceId] - Update a practice
export async function PATCH(
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

  // Verify user is admin of this team
  const membership = user.memberships.find((tm: any) => tm.teamId === practice.teamId)
  if (!membership || !membership.isAdmin) {
    return NextResponse.json({ error: 'You must be an admin to update practices' }, { status: 403 })
  }

  const body = await request.json()
  const { scheduledAt, location } = body

  const updated = await prisma.practice.update({
    where: { id: practiceId },
    data: {
      ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
      ...(location !== undefined && { location: location || null })
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

  return NextResponse.json({ practice: updated })
}

// DELETE /api/practices/[practiceId] - Delete a practice
export async function DELETE(
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

  // Verify user is admin of this team
  const membership = user.memberships.find((tm: any) => tm.teamId === practice.teamId)
  if (!membership || !membership.isAdmin) {
    return NextResponse.json({ error: 'You must be an admin to delete practices' }, { status: 403 })
  }

  await prisma.practice.delete({
    where: { id: practiceId }
  })

  return NextResponse.json({ success: true })
}
