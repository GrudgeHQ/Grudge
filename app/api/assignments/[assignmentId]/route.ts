import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const assignmentId = params?.assignmentId
  const session = (await getServerSession(authOptions as any)) as any
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!assignmentId) {
    return NextResponse.json({ error: 'assignmentId required' }, { status: 400 })
  }

  const caller = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!caller) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get the assignment with match info
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      match: {
        include: {
          team: {
            include: { members: true }
          }
        }
      }
    }
  })

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  // Check if this is a regular match assignment
  if (assignment.match) {
    // Handle regular match assignment deletion
    const callerMembership = assignment.match.team.members.find((m) => m.userId === caller.id)
    if (!callerMembership || !callerMembership.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only team admins can remove assignments' }, { status: 403 })
    }

    // Store assignment details before deletion for notification
    const removedUserId = assignment.userId
    const matchDetails = {
      id: assignment.match.id,
      opponentName: assignment.match.opponentName,
      scheduledAt: assignment.match.scheduledAt,
      location: assignment.match.location,
      teamId: assignment.match.teamId
    }

    // Delete the assignment
    await prisma.assignment.delete({
      where: { id: assignmentId }
    })

    // Create notification for the removed player
    await prisma.notification.create({
      data: {
        userId: removedUserId,
        teamId: matchDetails.teamId,
        type: 'ASSIGNMENT_REMOVED',
        payload: {
          matchId: matchDetails.id,
          opponentName: matchDetails.opponentName,
          scheduledAt: matchDetails.scheduledAt.toISOString(),
          location: matchDetails.location,
          teamId: matchDetails.teamId,
          removedBy: caller.id
        },
        read: false
      }
    })

    // Trigger realtime event
    try {
      const { trigger } = await import('@/lib/realtime')
      await trigger(assignment.match.teamId, 'assignment.removed', { assignmentId })
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true })
  }

  // If not a regular match, it might be a league match assignment
  // We need to find the season match using the matchId from the assignment
  const seasonMatch = await prisma.seasonMatch.findUnique({
    where: { id: assignment.matchId },
    include: {
      homeTeam: { include: { members: true } },
      awayTeam: { include: { members: true } }
    }
  })

  if (!seasonMatch) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // For league matches, determine which team the caller is admin of
  const isHomeTeamAdmin = seasonMatch.homeTeam.members.some(m => m.userId === caller.id && m.isAdmin)
  const isAwayTeamAdmin = seasonMatch.awayTeam.members.some(m => m.userId === caller.id && m.isAdmin)

  if (!isHomeTeamAdmin && !isAwayTeamAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only team admins can remove assignments' }, { status: 403 })
  }

  // Determine which team the caller belongs to
  const callerTeam = isHomeTeamAdmin ? seasonMatch.homeTeam : seasonMatch.awayTeam
  const callerTeamId = callerTeam.id

  // Verify the assigned user is from the caller's team (can only remove assignments from own team)
  const assignedUserIsFromCallerTeam = callerTeam.members.some(m => m.userId === assignment.userId)
  if (!assignedUserIsFromCallerTeam) {
    return NextResponse.json({ error: 'You can only remove assignments from your own team members' }, { status: 403 })
  }

  // Store assignment details before deletion for notification
  const removedUserId = assignment.userId
  const opponentTeamName = isHomeTeamAdmin ? seasonMatch.awayTeam.name : seasonMatch.homeTeam.name

  // Delete the assignment
  await prisma.assignment.delete({
    where: { id: assignmentId }
  })

  // Create notification for the removed player
  await prisma.notification.create({
    data: {
      userId: removedUserId,
      teamId: callerTeamId,
      type: 'ASSIGNMENT_REMOVED',
      payload: {
        matchId: seasonMatch.id,
        opponentName: opponentTeamName,
        scheduledAt: seasonMatch.scheduledAt?.toISOString(),
        location: seasonMatch.location,
        teamId: callerTeamId,
        removedBy: caller.id,
        isLeagueMatch: true
      },
      read: false
    }
  })

  // Trigger realtime event for caller's team only
  try {
    const { trigger } = await import('@/lib/realtime')
    await trigger(callerTeamId, 'assignment.removed', { assignmentId })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ ok: true })
}
