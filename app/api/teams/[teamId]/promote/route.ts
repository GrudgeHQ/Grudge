import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { userId, role } = body
  const teamId = params?.teamId
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // verify caller is admin
  const caller = await prisma.teamMember.findFirst({ where: { teamId, user: { email: session.user.email } } })
  if (!caller || !caller.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // If promoting to CAPTAIN, check if there's already a captain
  if (role === 'CAPTAIN') {
    const existingCaptain = await prisma.teamMember.findFirst({
      where: { teamId, role: 'CAPTAIN' },
      include: { user: { select: { name: true, email: true } } }
    })
    
    if (existingCaptain && existingCaptain.userId !== userId) {
      return NextResponse.json({ 
        error: `${existingCaptain.user.name || existingCaptain.user.email} is already the team captain. Each team can only have one captain.` 
      }, { status: 400 })
    }
  }

  // Promote to admin and set role
  const finalRole = role || 'ADMIN'
  const member = await prisma.teamMember.updateMany({ 
    where: { teamId, userId }, 
    data: { isAdmin: true, role: finalRole } 
  })
  
  return NextResponse.json({ ok: true, result: member, role: finalRole })
}
