import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '../../../../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user with all their team memberships
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            team: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Transform the data to match the expected format
    const teamsData = {
  teams: user.memberships.map((membership: { id: string; teamId: string; userId: string; role: string; isAdmin: boolean; joinedAt: Date; team: { id: string; name: string; sport: string; inviteCode?: string; members: any[] } }) => ({
        id: membership.id,
        teamId: membership.teamId,
        userId: membership.userId,
        role: membership.role,
        isAdmin: membership.isAdmin,
        joinedAt: membership.joinedAt,
        team: {
          id: membership.team.id,
          name: membership.team.name,
          sport: membership.team.sport,
          inviteCode: membership.isAdmin ? membership.team.inviteCode : undefined, // Only show invite code to admins
          members: membership.team.members
        }
      }))
    }

    return NextResponse.json(teamsData)
  } catch (error) {
    console.error('Error fetching user teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user teams' },
      { status: 500 }
    )
  }
}
