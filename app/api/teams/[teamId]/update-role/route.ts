import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCorrectAdminStatus, shouldHaveAdminAccess, TEAM_ROLES } from '@/lib/teamRoles'

export async function POST(req: Request, context: any) {
  const params = context?.params instanceof Promise ? await context.params : context?.params
  const session = (await getServerSession(authOptions as any)) as any
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const body = await req.json()
  const { userId, role } = body
  const teamId = params?.teamId
  
  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  // Valid roles for team role management
  if (!TEAM_ROLES.includes(role as any)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // verify caller is admin or the user themselves (for their own role selection)
  const caller = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // If no userId provided, user is updating their own role
  const targetUserId = userId || caller.id

  const callerMembership = await prisma.teamMember.findFirst({ 
    where: { teamId, userId: caller.id } 
  })
  
  const targetMembership = await prisma.teamMember.findFirst({
    where: { teamId, userId: targetUserId }
  })

  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Allow if caller is admin OR caller is updating their own role (and they're already admin)
  const canUpdate = (callerMembership?.isAdmin) || (caller.id === targetUserId && targetMembership.isAdmin)
  
  if (!canUpdate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If setting to CAPTAIN, check if there's already a captain
  if (role === 'CAPTAIN') {
    const existingCaptain = await prisma.teamMember.findFirst({
      where: { teamId, role: 'CAPTAIN' },
      include: { user: { select: { name: true, email: true } } }
    })
    
    if (existingCaptain && existingCaptain.userId !== targetUserId) {
      return NextResponse.json({ 
        error: `${existingCaptain.user.name || existingCaptain.user.email} is already the team captain. Each team can only have one captain.` 
      }, { status: 400 })
    }
  }

  // Determine correct admin status based on new role
  const correctAdminStatus = getCorrectAdminStatus(role, targetMembership.isAdmin)
  
  // Update the role and admin status
  const updatedMember = await prisma.teamMember.updateMany({ 
    where: { teamId, userId: targetUserId }, 
    data: { 
      role,
      isAdmin: correctAdminStatus
    } 
  })

  // Create audit log for role change
  if (role !== targetMembership.role || correctAdminStatus !== targetMembership.isAdmin) {
    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        teamId,
        targetId: targetUserId,
        action: 'ROLE_UPDATE',
        payload: {
          previousRole: targetMembership.role,
          newRole: role,
          previousIsAdmin: targetMembership.isAdmin,
          newIsAdmin: correctAdminStatus,
          details: `Role changed from ${targetMembership.role} to ${role}${correctAdminStatus !== targetMembership.isAdmin ? ` (admin access ${correctAdminStatus ? 'granted' : 'revoked'})` : ''}`
        }
      }
    })
  }
  
  return NextResponse.json({ 
    ok: true, 
    result: updatedMember, 
    role,
    isAdmin: correctAdminStatus,
    message: shouldHaveAdminAccess(role) 
      ? `Role updated to ${role} with automatic admin access` 
      : `Role updated to ${role}`
  })
}