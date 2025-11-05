import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { signSocketAuth } from '@/lib/realtime'

export async function POST(req: Request) {
  const body = await req.json()
  const { socket_id, channel_name } = body
  if (!socket_id || !channel_name) return NextResponse.json({ error: 'socket_id and channel_name required' }, { status: 400 })

  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // determine team id from channel name. expected: private-team-<teamId> or presence-team-<teamId>
  const match = channel_name.match(/(?:private|presence)-team-(.+)$/)
  const teamId = match ? match[1] : null

  // if channel includes a team id, verify membership
  if (teamId) {
    const member = await prisma.teamMember.findFirst({ where: { teamId, user: { email: session.user.email } } })
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const auth = signSocketAuth(socket_id, channel_name, { user_id: member.userId, user_info: { name: session.user.name ?? session.user.email } })
    return NextResponse.json(auth)
  }

  // fallback: sign public/private global channels
  const auth = signSocketAuth(socket_id, channel_name)
  return NextResponse.json(auth)
}
