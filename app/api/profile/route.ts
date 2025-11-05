import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      createdAt: true,
      memberships: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              sport: true
            }
          }
        }
      }
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, phone, bio, teamRoles } = body

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Update user profile
  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone
  if (bio !== undefined) updateData.bio = bio

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true
    }
  })

  // Update team roles if provided
  if (teamRoles && typeof teamRoles === 'object') {
    for (const [teamId, role] of Object.entries(teamRoles)) {
      // Verify user is admin of this team
      const membership = await prisma.teamMember.findFirst({
        where: {
          userId: user.id,
          teamId: teamId as string,
          isAdmin: true
        }
      })

      if (membership && typeof role === 'string' && ['COACH', 'COORDINATOR', 'CAPTAIN', 'CO_CAPTAIN'].includes(role)) {
        await prisma.teamMember.update({
          where: { id: membership.id },
          data: { role: role as any }
        })
      }
    }
  }

  return NextResponse.json({ ok: true, user: updatedUser })
}
