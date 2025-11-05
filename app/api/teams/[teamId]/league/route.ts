import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { teamId } = await params

  try {
    // Check if user is admin of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        user: { email: session.user.email },
        isAdmin: true
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find the league this team belongs to
    const leagueTeam = await prisma.leagueTeam.findFirst({
      where: { teamId },
      include: {
        league: {
          include: {
            teams: {
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
        }
      }
    })

    if (!leagueTeam) {
      return NextResponse.json({ league: null })
    }

    return NextResponse.json({ 
      league: {
        id: leagueTeam.league.id,
        name: leagueTeam.league.name,
        sport: leagueTeam.league.sport,
        teams: leagueTeam.league.teams
      }
    })
  } catch (error) {
    console.error('Error fetching team league:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}