import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET season match details with team-scoped availability responses
export async function GET(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const matchId = params?.matchId as string | undefined
  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
  }

  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const seasonMatch = await prisma.seasonMatch.findUnique({
    where: { id: matchId },
    include: {
      season: { include: { league: true } },
      homeTeam: { include: { members: true } },
      awayTeam: { include: { members: true } },
      availabilityRequests: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } }
        }
      }
    }
  })

  if (!seasonMatch) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const isHomeTeamMember = seasonMatch.homeTeam.members.some(m => m.userId === user.id)
  const isAwayTeamMember = seasonMatch.awayTeam.members.some(m => m.userId === user.id)
  if (!isHomeTeamMember && !isAwayTeamMember) {
    return NextResponse.json({ error: 'Only team members can view availability' }, { status: 403 })
  }

  const userTeam = isHomeTeamMember ? seasonMatch.homeTeam : seasonMatch.awayTeam
  const membership = userTeam.members.find(m => m.userId === user.id)
  const isAdmin = !!membership?.isAdmin

  // Filter availability to the user's team; if not admin, include only their own
  const filteredAvail = seasonMatch.availabilityRequests.filter(ar => ar.teamId === userTeam.id)
  const scopedAvail = isAdmin ? filteredAvail : filteredAvail.filter(ar => ar.userId === user.id)

  const transformed = {
    id: seasonMatch.id,
    scheduledAt: seasonMatch.scheduledAt ? seasonMatch.scheduledAt.toISOString() : null,
    location: seasonMatch.location || null,
    description: seasonMatch.description || null,
    notes: seasonMatch.notes || null,
    homeTeam: { id: seasonMatch.homeTeamId, name: seasonMatch.homeTeam.name },
    awayTeam: { id: seasonMatch.awayTeamId, name: seasonMatch.awayTeam.name },
    season: {
      name: seasonMatch.season.name,
      league: { name: seasonMatch.season.league.name }
    },
    availabilityRequests: scopedAvail.map(ar => ({
      id: ar.id,
      status: ar.status,
      notes: ar.notes || undefined,
      respondedAt: ar.respondedAt ? ar.respondedAt.toISOString() : undefined,
      user: ar.user,
      team: ar.team
    }))
  }

  return NextResponse.json({ match: transformed })
}

// POST create/update availability for current user on a season match
export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const matchId = params?.matchId as string | undefined
  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
  }

  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as any
  const status = body?.status as 'AVAILABLE' | 'MAYBE' | 'UNAVAILABLE' | undefined
  const notes = (body?.notes ?? '') as string
  if (!status || !['AVAILABLE','MAYBE','UNAVAILABLE'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

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

  const isHomeTeamMember = seasonMatch.homeTeam.members.some(m => m.userId === user.id)
  const isAwayTeamMember = seasonMatch.awayTeam.members.some(m => m.userId === user.id)
  if (!isHomeTeamMember && !isAwayTeamMember) {
    return NextResponse.json({ error: 'Only team members can provide availability' }, { status: 403 })
  }

  const userTeamId = isHomeTeamMember ? seasonMatch.homeTeamId : seasonMatch.awayTeamId

  const availability = await prisma.seasonMatchAvailability.upsert({
    where: {
      seasonMatchId_userId: { seasonMatchId: matchId, userId: user.id }
    },
    update: { status, notes, respondedAt: new Date() },
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
