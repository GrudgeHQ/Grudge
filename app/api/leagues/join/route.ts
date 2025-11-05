import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/leagues/join - Join a league with an invite code
export async function POST(request: Request) {
  try {
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

    const { inviteCode, teamId } = await request.json()

    if (!inviteCode || !teamId) {
      return NextResponse.json({ error: 'Invite code and team ID are required' }, { status: 400 })
    }

  // Find the league with this invite code
  const league = await prisma.league.findUnique({
    where: { inviteCode },
    include: {
      teams: {
        include: {
          team: true
        }
      },
      creator: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  if (!league) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  // Verify the team exists and user is an admin
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: {
          userId: user.id,
          isAdmin: true
        }
      }
    }
  })

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  if (team.members.length === 0) {
    return NextResponse.json({ error: 'You must be an admin of the team to join a league' }, { status: 403 })
  }

  // Verify sport matches
  if (team.sport !== league.sport) {
    return NextResponse.json({ 
      error: `This league is for ${league.sport} teams only. Your team is ${team.sport}.` 
    }, { status: 400 })
  }

  // Check if team is already in any league
  const existingLeagueTeam = await prisma.leagueTeam.findFirst({
    where: { teamId },
    include: {
      league: {
        select: {
          name: true
        }
      }
    }
  })

  if (existingLeagueTeam) {
    const leagueName = existingLeagueTeam.league?.name || 'another league'
    return NextResponse.json({ 
      error: `Your team is already in league "${leagueName}". Each team can only be in one league at a time.` 
    }, { status: 400 })
  }

  // Check if team is already in this league (redundant check but kept for safety)
  const existingMembership = league.teams.find(t => t.teamId === teamId)
  if (existingMembership) {
    return NextResponse.json({ error: 'Your team is already a member of this league' }, { status: 400 })
  }

  // Check if there's already a pending request
  const existingRequest = await prisma.leagueJoinRequest.findUnique({
    where: {
      leagueId_teamId: {
        leagueId: league.id,
        teamId: team.id
      }
    }
  })

  if (existingRequest) {
    if (existingRequest.status === 'PENDING') {
      return NextResponse.json({ error: 'Your team already has a pending request to join this league' }, { status: 400 })
    } else if (existingRequest.status === 'DENIED') {
      return NextResponse.json({ error: 'Your team\'s request to join this league was denied' }, { status: 400 })
    }
  }

  // Create a join request instead of directly joining
  const joinRequest = await prisma.leagueJoinRequest.create({
    data: {
      leagueId: league.id,
      teamId: team.id,
      requestedById: user.id,
      status: 'PENDING'
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          sport: true
        }
      },
      league: {
        select: {
          id: true,
          name: true,
          creator: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  // Verify the join request was created successfully
  if (!joinRequest || !joinRequest.team || !joinRequest.league) {
    console.error('Join request creation failed or missing data:', joinRequest)
    return NextResponse.json({ 
      error: 'Failed to create join request. Please try again.' 
    }, { status: 500 })
  }

  // Create notification for the League Manager (if there is one)
  if (league.creatorId && team?.name && league?.name) {
    try {
      await prisma.notification.create({
        data: {
          userId: league.creatorId,
          type: 'league_join_request',
          payload: {
            title: 'New League Join Request',
            message: `${team.name} has requested to join your league "${league.name}"`,
            requestId: joinRequest.id,
            teamId: team.id,
            teamName: team.name,
            leagueId: league.id,
            leagueName: league.name
          }
        }
      })
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // Don't fail the whole request if notification fails
    }
  }

  return NextResponse.json({ 
    message: 'Join request sent to League Manager',
    request: joinRequest
  })
  } catch (error: any) {
    console.error('Error joining league:', error)
    return NextResponse.json({ 
      error: 'An error occurred while joining the league. Please try again.' 
    }, { status: 500 })
  }
}
