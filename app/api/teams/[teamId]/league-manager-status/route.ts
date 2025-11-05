import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/teams/[teamId]/league-manager-status - Check if user is league manager for team's league
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await params

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is admin of this team
    const teamMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: user.id,
        isAdmin: true
      }
    })

    if (!teamMembership) {
      return NextResponse.json({ 
        isTeamAdmin: false, 
        isLeagueManager: false,
        canCreateLeagueMatches: false
      })
    }

    // Check if team is in a league and if user is the league manager
    const teamInLeague = await prisma.leagueTeam.findFirst({
      where: { teamId },
      include: {
        league: {
          include: {
            creator: true
          }
        }
      }
    })

    const isLeagueManager = teamInLeague ? teamInLeague.league.creatorId === user.id : false

    return NextResponse.json({
      isTeamAdmin: true,
      isLeagueManager,
      canCreateLeagueMatches: isLeagueManager, // Only league managers can create league matches
      league: teamInLeague ? {
        id: teamInLeague.league.id,
        name: teamInLeague.league.name,
        sport: teamInLeague.league.sport
      } : null
    })

  } catch (error) {
    console.error('Error checking league manager status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}