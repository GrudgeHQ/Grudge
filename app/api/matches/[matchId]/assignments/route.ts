import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const matchId = params?.matchId
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ assignments: [] })
  }

  const caller = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!caller) return NextResponse.json({ assignments: [] })

  // First try to find as regular match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { team: { include: { members: true } } }
  })

  if (match) {
    // Handle regular match assignments
    const callerMembership = match.team.members.find((m) => m.userId === caller.id)
    if (!callerMembership) {
      return NextResponse.json({ assignments: [] })
    }

    // Get assignments for this match
    // Admins see all assignments, regular members only see confirmed ones
    const whereClause = callerMembership.isAdmin
      ? { matchId }
      : { matchId, confirmed: true }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { assignedAt: 'desc' }
    })

    return NextResponse.json({ assignments, isAdmin: callerMembership.isAdmin })
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
    return NextResponse.json({ assignments: [] })
  }

  // Determine which team the caller belongs to
  const isHomeTeamMember = seasonMatch.homeTeam.members.some(m => m.userId === caller.id)
  const isAwayTeamMember = seasonMatch.awayTeam.members.some(m => m.userId === caller.id)

  if (!isHomeTeamMember && !isAwayTeamMember) {
    return NextResponse.json({ assignments: [] })
  }

  // Get caller's team and admin status
  const callerTeam = isHomeTeamMember ? seasonMatch.homeTeam : seasonMatch.awayTeam
  const callerMembership = callerTeam.members.find(m => m.userId === caller.id)
  const isAdmin = callerMembership?.isAdmin || false

  // For league matches, only show assignments from the caller's team
  // We need to filter assignments by users who are members of the caller's team
  const teamMemberIds = callerTeam.members.map(m => m.userId)

  const whereClause = isAdmin
    ? { matchId, userId: { in: teamMemberIds } }
    : { matchId, userId: { in: teamMemberIds }, confirmed: true }

  const assignments = await prisma.assignment.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: { assignedAt: 'desc' }
  })

  return NextResponse.json({ assignments, isAdmin })
}
