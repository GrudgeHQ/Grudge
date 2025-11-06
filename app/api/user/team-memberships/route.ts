import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { email?: string } }
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          select: {
            teamId: true,
            isAdmin: true,
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

  const memberships = user.memberships.map((membership: { teamId: string; isAdmin: boolean; team: { id: string; name: string } }) => ({
      teamId: membership.teamId,
      isAdmin: membership.isAdmin,
      team: membership.team
    }))

    return NextResponse.json({ 
      ok: true, 
      memberships 
    })

  } catch (error) {
    console.error('Error fetching user team memberships:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch team memberships' 
    }, { status: 500 })
  }
}