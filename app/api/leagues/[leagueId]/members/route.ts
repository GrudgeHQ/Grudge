import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await params

  try {
    // Check if user is a member of any team in this league
    const userTeamInLeague = await prisma.teamMember.findFirst({
      where: {
        user: { email: session.user.email },
        team: {
          leagues: {
            some: { leagueId }
          }
        }
      }
    })

    if (!userTeamInLeague) {
      return NextResponse.json({ error: 'Forbidden - Not a member of any team in this league' }, { status: 403 })
    }

    // Get all members from all teams in this league
    const leagueMembers = await prisma.teamMember.findMany({
      where: {
        team: {
          leagues: {
            some: { leagueId }
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            sport: true
          }
        }
      },
      orderBy: [
        { team: { name: 'asc' } },
        { user: { name: 'asc' } }
      ]
    })

    return NextResponse.json({ members: leagueMembers })
  } catch (error) {
    console.error('Error fetching league members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}