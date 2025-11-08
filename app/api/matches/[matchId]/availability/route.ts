import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const matchId = params?.matchId
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { status, notes } = body
  if (!['AVAILABLE','MAYBE','UNAVAILABLE'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // First try to find as a regular match
  const match = await prisma.match.findUnique({ 
    where: { id: matchId },
    include: { team: { include: { members: true } } }
  })

  // If not found as regular match, try as season match (league match)
  if (!match) {
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

    // Check if user is a member of either team
  const isHomeTeamMember = seasonMatch.homeTeam.members.some((m: typeof seasonMatch.homeTeam.members[number]) => m.userId === user.id)
  const isAwayTeamMember = seasonMatch.awayTeam.members.some((m: typeof seasonMatch.awayTeam.members[number]) => m.userId === user.id)
    
    if (!isHomeTeamMember && !isAwayTeamMember) {
      return NextResponse.json({ error: 'Only team members can provide availability' }, { status: 403 })
    }

    // Determine which team the user belongs to
    const userTeamId = isHomeTeamMember ? seasonMatch.homeTeamId : seasonMatch.awayTeamId

    // Update season match availability
    const availability = await prisma.seasonMatchAvailability.upsert({
      where: {
        seasonMatchId_userId: {
          seasonMatchId: matchId,
          userId: user.id
        }
      },
      update: {
        status,
        notes,
        respondedAt: new Date()
      },
      create: {
        seasonMatchId: matchId,
        userId: user.id,
        teamId: userTeamId,
        status,
        notes,
        respondedAt: new Date()
      }
    })

    return NextResponse.json({ ok: true, availability })
  }

  const isMember = match.team.members.some((m: typeof match.team.members[number]) => m.userId === user.id)
  if (!isMember) {
    return NextResponse.json({ error: 'Only team members can provide availability' }, { status: 403 })
  }

  // Check if user has an existing assignment
  const existingAssignment = await prisma.assignment.findUnique({
    where: { matchId_userId: { matchId, userId: user.id } }
  })

  // If changing to MAYBE or UNAVAILABLE and user is assigned, remove assignment and notify admins
  if ((status === 'MAYBE' || status === 'UNAVAILABLE') && existingAssignment) {
    // Delete the assignment
    await prisma.assignment.delete({
      where: { id: existingAssignment.id }
    })

    // Get all team admins
  const teamAdmins = match.team.members.filter((m: typeof match.team.members[number]) => m.isAdmin)

    // Notify each admin
    for (const admin of teamAdmins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          teamId: match.teamId,
          type: 'PLAYER_REMOVED_SELF',
          payload: {
            matchId,
            playerName: user.name || user.email,
            playerId: user.id,
            opponentName: match.opponentName,
            scheduledAt: match.scheduledAt.toISOString(),
            newStatus: status,
            teamId: match.teamId
          },
          read: false
        }
      })
    }

    // Trigger realtime event
    try {
      const { trigger } = await import('@/lib/realtime')
      await trigger(match.teamId, 'assignment.player_removed_self', { 
        matchId, 
        userId: user.id,
        assignmentId: existingAssignment.id 
      })
    } catch (e) {
      // ignore
    }
  }

  const up = await prisma.availability.upsert({ 
    where: { matchId_userId: { matchId, userId: user.id } }, 
    update: { status, notes }, 
    create: { matchId, userId: user.id, status, notes } 
  })
  
  return NextResponse.json({ ok: true, availability: up })
}

export async function GET(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const matchId = params?.matchId
  if (!matchId) return NextResponse.json({ availabilities: [], isAdmin: false })
  
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ availabilities: [], isAdmin: false })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ availabilities: [], isAdmin: false })

  // First try to find as a regular match
  const match = await prisma.match.findUnique({ 
    where: { id: matchId },
    include: { team: { include: { members: true } } }
  })

  if (!match) {
    // Try as season match (league match)
    const seasonMatch = await prisma.seasonMatch.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { include: { members: true } },
        awayTeam: { include: { members: true } }
      }
    })

    if (!seasonMatch) {
      return NextResponse.json({ availabilities: [], isAdmin: false })
    }

    // Check if user is a member of either team
  const isHomeTeamMember = seasonMatch.homeTeam.members.some((m: typeof seasonMatch.homeTeam.members[number]) => m.userId === user.id)
  const isAwayTeamMember = seasonMatch.awayTeam.members.some((m: typeof seasonMatch.awayTeam.members[number]) => m.userId === user.id)
    
    if (!isHomeTeamMember && !isAwayTeamMember) {
      return NextResponse.json({ availabilities: [], isAdmin: false })
    }

    // Determine user's team and admin status
    const userTeam = isHomeTeamMember ? seasonMatch.homeTeam : seasonMatch.awayTeam
    const userTeamId = userTeam.id
  const membership = userTeam.members.find((m: typeof userTeam.members[number]) => m.userId === user.id)
    const isAdmin = membership?.isAdmin || false

    // Get season match availabilities - ONLY from the user's team
  const userTeamMemberIds = userTeam.members.map((m: typeof userTeam.members[number]) => m.userId)
    const seasonAvailabilities = await prisma.seasonMatchAvailability.findMany({
      where: { 
        seasonMatchId: matchId,
        teamId: userTeamId, // Only get availability from user's team
        ...(isAdmin ? { userId: { in: userTeamMemberIds } } : { userId: user.id }) // Admins see all team members, regular users see only their own
      },
      include: { 
        user: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } }
      }
    })

    // Transform to match expected format
  const transformedAvailabilities = seasonAvailabilities.map((sa: typeof seasonAvailabilities[number]) => ({
      id: sa.id,
      matchId: sa.seasonMatchId,
      userId: sa.userId,
      status: sa.status,
      notes: sa.notes,
      updatedAt: sa.respondedAt || sa.updatedAt,
      user: sa.user
    }))

    return NextResponse.json({ 
      availabilities: transformedAvailabilities, 
      isAdmin, 
      currentUserId: user.id 
    })
  }

  // Handle regular match
  const membership = match.team.members.find((m: typeof match.team.members[number]) => m.userId === user.id)
  if (!membership) {
    // Not a team member, return empty
    return NextResponse.json({ availabilities: [], isAdmin: false })
  }

  const isAdmin = membership.isAdmin

  if (isAdmin) {
    // Admins can see all availabilities
    const av = await prisma.availability.findMany({ 
      where: { matchId },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    return NextResponse.json({ availabilities: av, isAdmin: true, currentUserId: user.id })
  } else {
    // Regular members only see their own availability
    const av = await prisma.availability.findMany({ 
      where: { matchId, userId: user.id },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    return NextResponse.json({ availabilities: av, isAdmin: false, currentUserId: user.id })
  }
}
