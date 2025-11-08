import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const matchId = params?.matchId
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { userId } = body
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const caller = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // First try to find as regular match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { team: { include: { members: true } } }
  })

  if (match) {
    // Handle regular match assignment
  const callerMembership = match.team.members.find((m: typeof match.team.members[number]) => m.userId === caller.id)
    if (!callerMembership || !callerMembership.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only team admins can assign players' }, { status: 403 })
    }

    // Check if player assignment is allowed - cannot assign if match has scores entered
    if (match.homeScore !== null && match.awayScore !== null) {
      return NextResponse.json({ error: 'Cannot assign players to completed matches with scores entered' }, { status: 400 })
    }

    // Verify the user being assigned is a team member
  const targetMembership = match.team.members.find((m: typeof match.team.members[number]) => m.userId === userId)
    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member of this team' }, { status: 400 })
    }

    // Verify availability - must be AVAILABLE
    const avail = await prisma.availability.findUnique({ where: { matchId_userId: { matchId, userId } } })
    if (!avail || avail.status !== 'AVAILABLE') {
      return NextResponse.json({ error: 'Player must be marked as available before assignment' }, { status: 400 })
    }

    // Check if already assigned
    const existing = await prisma.assignment.findUnique({ where: { matchId_userId: { matchId, userId } } })
    if (existing) {
      // If already assigned, create a new notification to remind them
      await prisma.notification.create({
        data: {
          userId,
          teamId: match.teamId,
          type: 'ASSIGNMENT_PENDING',
          payload: {
            matchId,
            assignmentId: existing.id,
            opponentName: match.opponentName,
            scheduledAt: match.scheduledAt.toISOString(),
            teamId: match.teamId
          },
          read: false
        }
      })

      return NextResponse.json({ 
        ok: true, 
        assignment: existing,
        message: 'Player already assigned, notification sent' 
      })
    }

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        matchId,
        userId,
        assignedById: caller.id,
        confirmed: false
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        match: { select: { id: true, scheduledAt: true, opponentName: true, location: true } }
      }
    })

    // Create notification for the assigned user
    await prisma.notification.create({
      data: {
        userId,
        teamId: match.teamId,
        type: 'ASSIGNMENT_PENDING',
        payload: {
          matchId,
          assignmentId: assignment.id,
          opponentName: match.opponentName,
          scheduledAt: match.scheduledAt.toISOString(),
          teamId: match.teamId
        },
        read: false
      }
    })

    // Trigger realtime event
    try {
      const { trigger } = await import('@/lib/realtime')
      await trigger(match.teamId, 'assignment.created', { assignment })
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true, assignment })
  }

  // Try as season match (league match)
  const seasonMatch = await prisma.seasonMatch.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { members: true } },
      awayTeam: { include: { members: true } }
    }
  })

  if (!seasonMatch) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Check if player assignment is allowed - cannot assign if match is completed with scores
  if (seasonMatch.status === 'COMPLETED' && seasonMatch.homeScore !== null && seasonMatch.awayScore !== null) {
    return NextResponse.json({ error: 'Cannot assign players to completed matches with scores entered' }, { status: 400 })
  }

  // Determine which team the caller is admin of
  const isHomeTeamAdmin = seasonMatch.homeTeam.members.some((m: typeof seasonMatch.homeTeam.members[number]) => m.userId === caller.id && m.isAdmin)
  const isAwayTeamAdmin = seasonMatch.awayTeam.members.some((m: typeof seasonMatch.awayTeam.members[number]) => m.userId === caller.id && m.isAdmin)

  if (!isHomeTeamAdmin && !isAwayTeamAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only team admins can assign players' }, { status: 403 })
  }

  // Determine which team the caller can assign from (their own team only)
  const callerTeam = isHomeTeamAdmin ? seasonMatch.homeTeam : seasonMatch.awayTeam
  const callerTeamId = callerTeam.id

  // Verify the user being assigned is a member of the caller's team ONLY
  const targetMembership = callerTeam.members.find((m: typeof callerTeam.members[number]) => m.userId === userId)
  if (!targetMembership) {
    return NextResponse.json({ error: 'You can only assign players from your own team' }, { status: 400 })
  }

  // Verify availability - must be AVAILABLE in SeasonMatchAvailability for the caller's team
  const seasonAvail = await prisma.seasonMatchAvailability.findUnique({ 
    where: { 
      seasonMatchId_userId: { 
        seasonMatchId: matchId, 
        userId 
      } 
    } 
  })
  if (!seasonAvail || seasonAvail.status !== 'AVAILABLE' || seasonAvail.teamId !== callerTeamId) {
    return NextResponse.json({ error: 'Player must be marked as available before assignment' }, { status: 400 })
  }

  // For league matches, we need to use SeasonMatchAssignment (if it exists) or adapt the regular Assignment table
  // Let me check if there's a separate assignment system for season matches...
  // For now, I'll use the regular assignment table but include teamId context

  // Check if already assigned
  const existing = await prisma.assignment.findUnique({ where: { matchId_userId: { matchId, userId } } })
  if (existing) {
    // If already assigned, create a new notification to remind them
    const opponentTeamName = isHomeTeamAdmin ? seasonMatch.awayTeam.name : seasonMatch.homeTeam.name
    
    await prisma.notification.create({
      data: {
        userId,
        teamId: callerTeamId,
        type: 'ASSIGNMENT_PENDING',
        payload: {
          matchId,
          assignmentId: existing.id,
          opponentName: opponentTeamName,
          scheduledAt: seasonMatch.scheduledAt?.toISOString(),
          teamId: callerTeamId,
          isLeagueMatch: true
        },
        read: false
      }
    })

    return NextResponse.json({ 
      ok: true, 
      assignment: existing,
      message: 'Player already assigned, notification sent' 
    })
  }

  // Create assignment for league match
  const assignment = await prisma.assignment.create({
    data: {
      matchId,
      userId,
      assignedById: caller.id,
      confirmed: false
    },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  })

  // Create notification for the assigned user
  const opponentTeamName = isHomeTeamAdmin ? seasonMatch.awayTeam.name : seasonMatch.homeTeam.name
  
  await prisma.notification.create({
    data: {
      userId,
      teamId: callerTeamId,
      type: 'ASSIGNMENT_PENDING',
      payload: {
        matchId,
        assignmentId: assignment.id,
        opponentName: opponentTeamName,
        scheduledAt: seasonMatch.scheduledAt?.toISOString(),
        teamId: callerTeamId,
        isLeagueMatch: true
      },
      read: false
    }
  })

  // Trigger realtime event for the caller's team only
  try {
    const { trigger } = await import('@/lib/realtime')
    await trigger(callerTeamId, 'assignment.created', { assignment })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ ok: true, assignment })
}
