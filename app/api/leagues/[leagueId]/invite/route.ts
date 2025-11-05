import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await params
  const { teamId } = await req.json()

  if (!teamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
  }

  try {
    // Verify the user is the league creator
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { 
        creator: true,
        teams: {
          where: {
            teamId: teamId
          }
        }
      }
    })

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (!league.creator || league.creator.email !== session.user.email) {
      return NextResponse.json({ error: 'Only league creators can invite teams' }, { status: 403 })
    }

    // Check if team is already in the league
    if (league.teams.length > 0) {
      return NextResponse.json({ error: 'Team is already in this league' }, { status: 400 })
    }

    // Get the team to invite
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if sports match
    if (team.sport !== league.sport) {
      return NextResponse.json({ 
        error: `Team sport (${team.sport}) doesn't match league sport (${league.sport})` 
      }, { status: 400 })
    }

    // Create notifications for all team members
  const notifications = team.members.map((member: any) => ({
      userId: member.user.id,
      type: 'LEAGUE_INVITATION' as const,
      message: `Your team "${team.name}" has been invited to join the "${league.name}" league`,
      data: {
        leagueId: league.id,
        leagueName: league.name,
        teamId: team.id,
        teamName: team.name,
        inviteCode: league.inviteCode
      }
    }))

    await prisma.notification.createMany({
      data: notifications
    })

    return NextResponse.json({ 
      message: `Invitation sent to ${team.name}`,
      teamName: team.name,
      notificationsSent: notifications.length
    })
  } catch (error) {
    console.error('Error inviting team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}