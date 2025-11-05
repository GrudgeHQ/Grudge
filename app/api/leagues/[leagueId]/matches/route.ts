import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/leagues/[leagueId]/matches - Get all matches for a league
export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params
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

  // Verify the league exists and user has access (member of a team in the league or league manager)
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              members: {
                where: { userId: user.id },
                select: { id: true }
              }
            }
          }
        }
      }
    }
  })

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Check if user is league manager or member of a team in the league
  const isLeagueManager = league.creatorId === user.id
  const isTeamMember = league.teams.some(lt => lt.team.members.length > 0)

  if (!isLeagueManager && !isTeamMember) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get all league matches
  const matches = await prisma.leagueMatch.findMany({
    where: { leagueId },
    include: {
      homeTeam: {
        select: {
          id: true,
          name: true
        }
      },
      awayTeam: {
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
      }
    },
    orderBy: { scheduledAt: 'asc' }
  })

  return NextResponse.json({ 
    matches,
    isLeagueManager,
    league: {
      id: league.id,
      name: league.name,
      sport: league.sport
    }
  })
}