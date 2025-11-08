import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const matchId = params?.matchId
  const session = (await getServerSession(authOptions as any)) as any
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 })
  }

  const body = await req.json()
  const { opponentName, scheduledAt, location, homeScore, awayScore, requiredPlayers } = body

  // Get the match with team info
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { team: { include: { members: true } } }
  })

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Verify caller is admin of the team
  const caller = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!caller) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const callerMembership = match.team.members.find((m: typeof match.team.members[number]) => m.userId === caller.id)
  if (!callerMembership || !callerMembership.isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only team admins can update matches' }, { status: 403 })
  }

  // Update the match with provided fields
  const updateData: any = {}
  if (opponentName !== undefined) updateData.opponentName = opponentName
  if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt)
  if (location !== undefined) updateData.location = location
  if (homeScore !== undefined) updateData.homeScore = homeScore
  if (awayScore !== undefined) updateData.awayScore = awayScore
  if (requiredPlayers !== undefined) updateData.requiredPlayers = requiredPlayers

  const updatedMatch = await prisma.match.update({
    where: { id: matchId },
    data: updateData
  })

  // Trigger realtime event
  try {
    const { trigger } = await import('@/lib/realtime')
    await trigger(match.teamId, 'match.updated', { matchId, match: updatedMatch })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ ok: true, match: updatedMatch })
}

export async function DELETE(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const matchId = params?.matchId
  const session = (await getServerSession(authOptions as any)) as any
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 })
  }

  // Get the match with team info
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { team: { include: { members: true } } }
  })

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // Verify caller is admin of the team
  const caller = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!caller) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const callerMembership = match.team.members.find((m: typeof match.team.members[number]) => m.userId === caller.id)
  if (!callerMembership || !callerMembership.isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only team admins can delete matches' }, { status: 403 })
  }

  // Delete related data first (cascade delete)
  await prisma.availability.deleteMany({ where: { matchId } })
  await prisma.assignment.deleteMany({ where: { matchId } })
  
  // Delete the match
  await prisma.match.delete({ where: { id: matchId } })

  // Trigger realtime event
  try {
    const { trigger } = await import('@/lib/realtime')
    await trigger(match.teamId, 'match.deleted', { matchId })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ ok: true })
}
