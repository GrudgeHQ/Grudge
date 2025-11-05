import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/teams/[teamId]/members - Get all members of a team
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params
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

  // Verify user is a member of this team
  const membership = user.memberships.find((m: any) => m.teamId === teamId)
  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this team' }, { status: 403 })
  }

  // Get all team members including admins
  const members = await prisma.teamMember.findMany({
    where: {
      teamId
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      user: {
        name: 'asc'
      }
    }
  })

  return NextResponse.json({ members })
}
