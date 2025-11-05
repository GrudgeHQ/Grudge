import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { updateTeamSchema } from '@/lib/validators/team'

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const teamId = params?.teamId
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 })

  // verify caller is admin
  const caller = await prisma.teamMember.findFirst({ where: { teamId, user: { email: session.user.email } } })
  if (!caller || !caller.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any
  try {
    const json = await req.json()
    body = updateTeamSchema.parse(json)
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid input', details: err?.errors ?? err?.message }, { status: 400 })
  }

  const data: any = {}
  if (body.name) data.name = body.name
  if (Object.prototype.hasOwnProperty.call(body, 'password')) {
    // empty string means clear password
    if (body.password === '' || body.password === null) data.password = null
    else if (typeof body.password === 'string') data.password = await bcrypt.hash(body.password, 10)
  }

  const updated = await prisma.team.update({ where: { id: teamId }, data })
  return NextResponse.json({ ok: true, team: updated })
}
